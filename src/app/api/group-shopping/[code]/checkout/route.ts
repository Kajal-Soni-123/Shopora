export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { resolveActingMember, isStaleIdentity, STALE_IDENTITY_ERROR } from '@/lib/groupMember';
import { calculateShares, CheckoutMode, SplitMethod } from '@/lib/groupSplit';
import { formatCurrency } from '@/lib/utils';

const SESSION_INCLUDE = {
  hostUser: { select: { id: true, name: true, email: true, avatar: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  },
  items: {
    include: {
      product: { select: { id: true, title: true, price: true, image: true, stock: true, vendorId: true } },
      addedBy: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.GroupShoppingSessionInclude;

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

/** Load the session and the host acting on it; returns an error response when not allowed. */
async function loadForHost(code: string, memberId?: string | null) {
  const user = await getSessionUser();
  const session = await prisma.groupShoppingSession.findUnique({ where: { code }, include: SESSION_INCLUDE });
  if (!session) return { error: fail('Group shopping session not found', 404) };

  const actor = resolveActingMember(session.members, user, memberId);
  if (isStaleIdentity(actor, user, memberId)) return { error: fail(STALE_IDENTITY_ERROR, 409, { staleIdentity: true }) };
  if (!actor || actor.role !== 'HOST') return { error: fail('Only the party host can manage checkout.', 403) };
  return { session, actor };
}

// POST: host locks the group cart and starts checkout (host pays all, or split by items / equally)
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const body = await req.json();
    const { memberId, shipping } = body;
    const mode: CheckoutMode = body.checkoutMode === 'SPLIT_PAY' ? 'SPLIT_PAY' : 'HOST_PAY';
    const method: SplitMethod = body.splitMethod === 'EQUAL' ? 'EQUAL' : 'BY_ITEMS';

    const loaded = await loadForHost(params.code, memberId);
    if (loaded.error) return loaded.error;
    const { session, actor } = loaded;

    if (session.status !== 'ACTIVE') return fail('Checkout has already started for this party.', 409);
    if (session.items.length === 0) return fail('Group shopping cart is empty', 400);
    if (!shipping?.name?.trim() || !shipping?.email?.trim() || !shipping?.address?.trim()) {
      return fail('Please fill in the delivery name, email and address.', 400);
    }

    const { total, shares } = calculateShares(session.members, session.items, mode, method);
    if (shares.length === 0) return fail('Nothing to pay for in this cart.', 400);

    const hostName = actor.user?.name || actor.guestName;
    const announcement =
      mode === 'HOST_PAY'
        ? `🧾 ${hostName} started checkout and is paying for the whole cart (${formatCurrency(total)}).`
        : method === 'BY_ITEMS'
          ? `🧾 ${hostName} started checkout — everyone pays for the items they added (total ${formatCurrency(total)}). Open the Group Cart to pay your share!`
          : `🧾 ${hostName} started checkout — the ${formatCurrency(total)} total is split equally between ${shares.length} people. Open the Group Cart to pay your share!`;

    await prisma.$transaction(async (tx) => {
      // Only one checkout can start: the status flip is the lock
      const locked = await tx.groupShoppingSession.updateMany({
        where: { id: session.id, status: 'ACTIVE' },
        data: {
          status: 'WAITING_FOR_PAYMENTS',
          checkoutMode: mode,
          splitMethod: mode === 'SPLIT_PAY' ? method : null,
          checkoutInfo: {
            shipping: {
              name: shipping.name.trim(),
              email: shipping.email.trim(),
              phone: shipping.phone?.trim() || null,
              address: shipping.address.trim(),
            },
            total,
            startedAt: new Date().toISOString(),
            startedBy: actor.id,
          },
        },
      });
      if (locked.count === 0) throw new Error('CHECKOUT_ALREADY_STARTED');

      await tx.groupSessionMember.updateMany({
        where: { sessionId: session.id },
        data: { shareAmount: null, paidAt: null, paymentInfo: Prisma.DbNull },
      });
      for (const share of shares) {
        await tx.groupSessionMember.update({ where: { id: share.memberId }, data: { shareAmount: share.amount } });
      }
      await tx.groupChatMessage.create({
        data: { sessionId: session.id, senderId: actor.id, type: 'SYSTEM_EVENT', content: announcement, reactions: {}, votes: {} },
      });
    });

    const updated = await prisma.groupShoppingSession.findUnique({ where: { id: session.id }, include: SESSION_INCLUDE });
    return NextResponse.json({
      success: true,
      data: updated,
      message: mode === 'SPLIT_PAY' ? 'Group cart locked! Members can now pay their share.' : 'Group cart locked for host checkout.',
    });
  } catch (error: any) {
    if (error?.message === 'CHECKOUT_ALREADY_STARTED') return fail('Checkout has already started for this party.', 409);
    console.error('Error starting group checkout:', error);
    return fail(error.message || 'Failed to start group checkout', 500);
  }
}

// DELETE: host cancels checkout and re-opens the cart (only while nobody has paid)
export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const memberId = new URL(req.url).searchParams.get('memberId');
    const loaded = await loadForHost(params.code, memberId);
    if (loaded.error) return loaded.error;
    const { session, actor } = loaded;

    if (session.status !== 'WAITING_FOR_PAYMENTS') return fail('Checkout is not in progress.', 409);
    const paid = session.members.filter((m) => m.paidAt);
    if (paid.length > 0) {
      const names = paid.map((m) => m.user?.name || m.guestName).join(', ');
      return fail(`Checkout can't be cancelled because ${names} already paid.`, 409);
    }

    await prisma.$transaction([
      prisma.groupShoppingSession.update({
        where: { id: session.id },
        data: { status: 'ACTIVE', splitMethod: null, checkoutInfo: Prisma.DbNull },
      }),
      prisma.groupSessionMember.updateMany({
        where: { sessionId: session.id },
        data: { shareAmount: null, paidAt: null, paymentInfo: Prisma.DbNull },
      }),
      prisma.groupChatMessage.create({
        data: {
          sessionId: session.id,
          senderId: actor.id,
          type: 'SYSTEM_EVENT',
          content: `↩️ ${actor.user?.name || actor.guestName} cancelled checkout — the group cart is open again.`,
          reactions: {},
          votes: {},
        },
      }),
    ]);

    const updated = await prisma.groupShoppingSession.findUnique({ where: { id: session.id }, include: SESSION_INCLUDE });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error cancelling group checkout:', error);
    return fail(error.message || 'Failed to cancel group checkout', 500);
  }
}
