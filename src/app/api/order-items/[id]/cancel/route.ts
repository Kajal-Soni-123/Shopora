import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(ApiResponse.unauthorized('Authentication required'), { status: 401 });
    }

    const orderItemId = params.id;
    const body = await req.json().catch(() => ({}));
    const { reason, note } = body as { reason?: string; note?: string };
    const cancellationReason = reason || note || 'CHANGED_MIND';

    // Fetch orderItem with subOrder and master Order
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        subOrder: {
          include: {
            order: true,
            items: true,
            shipments: true,
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(ApiResponse.notFound('Order item not found'), { status: 404 });
    }

    const subOrder = orderItem.subOrder;
    const masterOrder = subOrder.order;

    // Customer authorization check
    if (sessionUser.role === 'CUSTOMER') {
      const isOwner = masterOrder.userId === sessionUser.userId || masterOrder.customerEmail === sessionUser.email;
      if (!isOwner) {
        return NextResponse.json(ApiResponse.forbidden('Permission denied'), { status: 403 });
      }
    }

    // Vendor authorization check
    if (sessionUser.role === 'VENDOR') {
      if (subOrder.vendorId !== sessionUser.vendorId) {
        return NextResponse.json(ApiResponse.forbidden('Permission denied'), { status: 403 });
      }
    }

    // Check if item is already cancelled
    if (orderItem.status === 'CANCELLED') {
      return NextResponse.json(ApiResponse.badRequest('This item has already been cancelled'), { status: 400 });
    }

    // State machine check: cannot cancel item if shipment is dispatched
    const nonCancellableStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    for (const shp of subOrder.shipments) {
      if (nonCancellableStatuses.includes((shp.status || '').toUpperCase())) {
        return NextResponse.json(
          ApiResponse.badRequest(`Item cannot be cancelled because shipment #${shp.awbNumber || shp.id} is already dispatched.`),
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const itemRefundAmount = Number((orderItem.price * orderItem.quantity).toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cancel the single order item
      const updatedItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason,
        },
      });

      // 2. Check if all items in this subOrder are now cancelled
      const allSubItems = await tx.orderItem.findMany({
        where: { subOrderId: subOrder.id },
      });

      const allItemsCancelled = allSubItems.every((item) => item.status === 'CANCELLED');

      if (allItemsCancelled) {
        await tx.subOrder.update({
          where: { id: subOrder.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancellationReason,
            cancelledBy: sessionUser.role,
          },
        });

        await tx.shipment.updateMany({
          where: { fulfillmentId: subOrder.id, status: { notIn: ['CANCELLED', 'DELIVERED'] } },
          data: { status: 'CANCELLED' },
        });
      }

      // 3. Update master order aggregate status
      const allSubOrders = await tx.subOrder.findMany({
        where: { orderId: masterOrder.id },
        include: { items: true },
      });

      const allMasterItemsCancelled = allSubOrders.every((s) => s.items.every((i) => i.status === 'CANCELLED'));
      const anyItemCancelled = allSubOrders.some((s) => s.items.some((i) => i.status === 'CANCELLED'));

      const aggregateStatus = allMasterItemsCancelled
        ? 'CANCELLED'
        : anyItemCancelled
        ? 'PARTIALLY_CANCELLED'
        : masterOrder.aggregateStatus;

      // 4. Refund calculation for prepaid order
      let newPaymentStatus = masterOrder.paymentStatus;

      if (masterOrder.paymentMethod !== 'COD' && masterOrder.paymentStatus === 'PAID') {
        await tx.refund.create({
          data: {
            orderId: masterOrder.id,
            subOrderId: subOrder.id,
            orderItemId: orderItem.id,
            userId: sessionUser.userId,
            amount: itemRefundAmount,
            method: 'ORIGINAL_PAYMENT_METHOD',
            status: 'COMPLETED',
            reason: cancellationReason,
            initiatedAt: now,
            completedAt: now,
          },
        });

        newPaymentStatus = allMasterItemsCancelled ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      }

      await tx.order.update({
        where: { id: masterOrder.id },
        data: { aggregateStatus, paymentStatus: newPaymentStatus },
      });

      return updatedItem;
    });

    return NextResponse.json(ApiResponse.success(result, 'Order item cancelled successfully'));
  } catch (err: any) {
    console.error('Order item cancellation error:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
