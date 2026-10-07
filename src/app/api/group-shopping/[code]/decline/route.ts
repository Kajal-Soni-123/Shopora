export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// POST /api/group-shopping/[code]/decline — the logged-in user declines a pending party invitation
export async function POST(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getSessionUser();
    if (!user?.userId || !user.email) {
      return NextResponse.json({ success: false, error: 'Please log in to respond to invitations.' }, { status: 401 });
    }

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code: params.code },
      include: { members: true },
    });
    if (!session) return NextResponse.json({ success: false, error: 'Party not found' }, { status: 404 });

    const invite = session.members.find(
      (m) =>
        m.status === 'INVITED' &&
        (m.userId === user.userId || m.guestEmail?.toLowerCase() === user.email.toLowerCase())
    );
    if (!invite) {
      return NextResponse.json({ success: false, error: 'No pending invitation for you in this party.' }, { status: 404 });
    }

    const host = session.members.find((m) => m.role === 'HOST');
    await prisma.$transaction([
      prisma.groupSessionMember.delete({ where: { id: invite.id } }),
      ...(host
        ? [
            prisma.groupChatMessage.create({
              data: {
                sessionId: session.id,
                senderId: host.id,
                type: 'SYSTEM_EVENT',
                content: `🙅 ${user.name || invite.guestName} declined the invitation.`,
                reactions: {},
                votes: {},
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, message: 'Invitation declined.' });
  } catch (error: any) {
    console.error('Error declining group invite:', error);
    return NextResponse.json({ success: false, error: 'Failed to decline invitation' }, { status: 500 });
  }
}
