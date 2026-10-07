export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { resolveActingMember } from '@/lib/groupMember';
import { createNotification } from '@/lib/notificationService';
import { GENIE_EMAIL } from '@/lib/groupSplit';

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

/**
 * DELETE /api/group-shopping/[code]/members?memberId=...
 *  - a member leaves (memberId = themselves), or the host removes a member
 *  - the HOST leaving ends the party: every other member is removed and the party is closed
 */
export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const currentUser = await getSessionUser();
    const memberId = new URL(req.url).searchParams.get('memberId');

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code: params.code },
      include: { members: { include: { user: { select: { name: true } } } } },
    });
    if (!session) return fail('Group shopping session not found', 404);

    // Who is asking: the logged-in user's own member record (guests can only act on guest rows)
    const actor = currentUser ? resolveActingMember(session.members, currentUser, null) : null;
    const target = memberId
      ? session.members.find((m) => m.id === memberId)
      : actor;
    if (!target) return fail('Member not found in this group session', 404);

    const isSelf = actor ? actor.id === target.id : !currentUser && !target.userId;
    const isHostActing = actor?.role === 'HOST';
    if (!isSelf && !isHostActing) return fail('Only the host can remove other members.', 403);

    // While the cart is locked for payment nobody can leave, be removed, or end the party —
    // shares (and any payments already made) depend on the current members
    if (['WAITING_FOR_PAYMENTS', 'CHECKED_OUT'].includes(session.status)) {
      return fail(
        target.role === 'HOST'
          ? "Checkout is in progress — the party can't be ended until the payment is completed (or you cancel checkout)."
          : "Checkout is in progress — members can't leave or be removed until the payment is completed.",
        409
      );
    }

    // ---------- Host leaves → the party ends for everyone ----------
    if (target.role === 'HOST') {
      if (!isSelf) return fail('Only the host can end the party.', 403);

      const hostName = target.user?.name || target.guestName;
      const others = session.members.filter((m) => m.id !== target.id && m.guestEmail !== GENIE_EMAIL);

      await prisma.$transaction([
        // Removing members also removes their cart items and chat messages (cascade)
        prisma.groupSessionMember.deleteMany({ where: { sessionId: session.id, id: { not: target.id } } }),
        prisma.groupShoppingSession.update({
          where: { id: session.id },
          data: { status: 'CLOSED', splitMethod: null, checkoutInfo: { endedBy: target.id, endedAt: new Date().toISOString() } },
        }),
      ]);

      // Let everyone know (in-app notification; their screens also leave the party on the next refresh)
      await Promise.all(
        others
          .filter((m) => m.userId || m.guestEmail)
          .map((m) =>
            createNotification({
              userId: m.userId,
              email: m.guestEmail,
              title: 'Group Shopping Party ended',
              message: `${hostName} ended the party "${session.title}". The group cart and chat are no longer available.`,
              type: 'SYSTEM',
              link: '/',
              metadata: { groupCode: session.code, sessionTitle: session.title, hostName },
            }).catch((err) => console.error('Party-ended notification failed:', err))
          )
      );

      return NextResponse.json({
        success: true,
        partyEnded: true,
        message:
          others.length === 0
            ? `You ended "${session.title}".`
            : `You ended "${session.title}". ${others.length === 1 ? 'The other member was' : `All ${others.length} members were`} removed.`,
      });
    }

    // ---------- A member leaves / is removed ----------
    await prisma.groupSessionMember.delete({ where: { id: target.id } });

    return NextResponse.json({
      success: true,
      message: `Member ${target.guestName} removed successfully from the party.`,
    });
  } catch (error: any) {
    console.error('Error removing group session member:', error);
    return fail(error.message || 'Failed to remove member', 500);
  }
}
