export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { resolveActingMember, isStaleIdentity, STALE_IDENTITY_ERROR } from '@/lib/groupMember';
import { createOrderRecord } from '@/lib/orders/createOrder';
import { formatCurrency } from '@/lib/utils';

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

interface CheckoutInfo {
  shipping: { name: string; email: string; phone: string | null; address: string };
  total: number;
  [key: string]: unknown;
}

// POST: a member records the payment of their share. When the last share is paid,
// the group order is created server-side from the locked cart (DB prices).
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await getSessionUser();
    const { memberId, transactionId, paymentMethod, maskedDetails } = await req.json();

    if (!transactionId) return fail('Payment reference is missing.', 400);

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code: params.code },
      include: {
        members: { include: { user: { select: { name: true } } } },
        items: { include: { product: true } },
      },
    });
    if (!session) return fail('Group shopping session not found', 404);

    const payer = resolveActingMember(session.members, user, memberId);
    if (isStaleIdentity(payer, user, memberId)) return fail(STALE_IDENTITY_ERROR, 409, { staleIdentity: true });
    if (!payer) return fail('You must be part of this party to pay.', 403);
    if (session.status !== 'WAITING_FOR_PAYMENTS') return fail('This party is not waiting for payments.', 409);
    if (!payer.shareAmount || payer.shareAmount <= 0) return fail("You don't have a share to pay for this order.", 400);

    const payment = {
      transactionId,
      method: paymentMethod || 'CREDIT_CARD',
      maskedDetails: maskedDetails || null,
      amount: payer.shareAmount,
    };

    // Conditional update so a double-click / retry can't record the payment twice
    const claimed = await prisma.groupSessionMember.updateMany({
      where: { id: payer.id, paidAt: null },
      data: { paidAt: new Date(), status: 'PAID', paymentInfo: payment },
    });
    if (claimed.count === 0) {
      // Everyone paid but the order wasn't placed (e.g. a failure while saving it) — retry now
      const unpaid = await prisma.groupSessionMember.count({
        where: { sessionId: session.id, shareAmount: { gt: 0 }, paidAt: null },
      });
      if (unpaid === 0) {
        const order = await placeGroupOrder(session.id);
        if (order) return NextResponse.json({ success: true, data: { order }, message: 'Your group order is placed! 🎉' });
      }
      return fail('Your share is already paid. 🎉', 409);
    }

    const payers = session.members.filter((m) => (m.shareAmount || 0) > 0);
    const paidCount = await prisma.groupSessionMember.count({
      where: { sessionId: session.id, shareAmount: { gt: 0 }, paidAt: { not: null } },
    });
    const payerName = payer.user?.name || payer.guestName;

    await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: payer.id,
        type: 'SYSTEM_EVENT',
        content:
          payers.length > 1
            ? `✅ ${payerName} paid their share (${formatCurrency(payer.shareAmount)}) — ${paidCount} of ${payers.length} paid.`
            : `✅ ${payerName} paid ${formatCurrency(payer.shareAmount)} for the group order.`,
        reactions: {},
        votes: {},
      },
    });

    let order = null;
    if (paidCount >= payers.length) {
      order = await placeGroupOrder(session.id);
    }

    return NextResponse.json({
      success: true,
      data: { paidCount, payerCount: payers.length, order },
      message: order ? 'Everyone has paid — your group order is placed! 🎉' : 'Your share is paid! 🎉',
    });
  } catch (error: any) {
    console.error('Error paying group share:', error);
    return fail(error.message || 'Failed to record your payment', 500);
  }
}

/** Create the order once every share is paid. Exactly one caller wins the status flip. */
async function placeGroupOrder(sessionId: string) {
  const won = await prisma.groupShoppingSession.updateMany({
    where: { id: sessionId, status: 'WAITING_FOR_PAYMENTS' },
    data: { status: 'CHECKED_OUT' },
  });
  if (won.count === 0) return null;

  let session;
  let info: CheckoutInfo;
  let order;
  try {
    session = await prisma.groupShoppingSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        members: { include: { user: { select: { name: true } } } },
        items: { include: { product: true } },
      },
    });
    info = session.checkoutInfo as unknown as CheckoutInfo;
    const contributions = session.members
      .filter((m) => (m.shareAmount || 0) > 0)
      .map((m) => {
        const p = (m.paymentInfo || {}) as Record<string, unknown>;
        return {
          memberId: m.id,
          name: m.user?.name || m.guestName,
          amount: m.shareAmount,
          transactionId: p.transactionId,
          method: p.method,
          maskedDetails: p.maskedDetails,
        };
      });
    const single = contributions.length === 1 ? contributions[0] : null;

    order = await createOrderRecord({
      items: session.items.map((i) => ({
        product: {
          id: i.product.id,
          price: i.product.price,
          vendorId: i.product.vendorId,
          attributes: i.attributes ?? null,
        },
        quantity: i.quantity,
      })),
      userId: session.hostUserId,
      customerName: info.shipping.name,
      customerEmail: info.shipping.email,
      customerPhone: info.shipping.phone,
      shippingAddress: info.shipping.address,
      paymentMethod: single ? String(single.method || 'CREDIT_CARD') : 'GROUP_SPLIT',
      paymentStatus: 'PAID',
      transactionId: single ? String(single.transactionId) : `grp_${session.code}_${Date.now().toString(36)}`,
      paymentDetails: {
        method: single ? single.method : 'GROUP_SPLIT',
        maskedDetails: single
          ? single.maskedDetails || `Paid by ${single.name}`
          : `Split between ${contributions.length} members (${session.splitMethod === 'EQUAL' ? 'equal split' : 'by items'})`,
        provider: 'Shopora Pay Gateway',
        groupCode: session.code,
        contributions,
      },
    });
  } catch (err) {
    // Re-open payments so the last payer (or host) can retry finalising
    await prisma.groupShoppingSession.update({ where: { id: sessionId }, data: { status: 'WAITING_FOR_PAYMENTS' } });
    throw err;
  }

  // Order is placed: empty the group cart and reopen the party so the group can keep shopping.
  // (Who paid what is kept on the order's paymentDetails.contributions.)
  const host = session.members.find((m) => m.role === 'HOST');
  await prisma.$transaction([
    prisma.groupCartItem.deleteMany({ where: { sessionId } }),
    prisma.groupSessionMember.updateMany({
      where: { sessionId },
      data: { shareAmount: null, paidAt: null, paymentInfo: Prisma.DbNull },
    }),
    prisma.groupSessionMember.updateMany({ where: { sessionId, status: 'PAID' }, data: { status: 'JOINED' } }),
    prisma.groupShoppingSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        splitMethod: null,
        checkoutInfo: {
          lastOrder: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.totalAmount,
            shipping: info.shipping,
            completedAt: new Date().toISOString(),
          },
        },
      },
    }),
    ...(host
      ? [
          prisma.groupChatMessage.create({
            data: {
              sessionId,
              senderId: host.id,
              type: 'SYSTEM_EVENT',
              content: `🎉 Everyone has paid! Order ${order.orderNumber} is confirmed and will ship to ${info.shipping.name}. The group cart is empty again — happy shopping!`,
              reactions: {},
              votes: {},
            },
          }),
        ]
      : []),
  ]);
  return order;
}
