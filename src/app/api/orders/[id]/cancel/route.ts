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

    const orderId = params.id;
    const body = await req.json().catch(() => ({}));
    const { subOrderId, reason, note } = body as { subOrderId?: string; reason?: string; note?: string };

    const cancellationReason = reason || note || 'CHANGED_MIND';

    // Fetch master order with subOrders and shipments
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: true,
            shipments: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(ApiResponse.notFound('Order not found'), { status: 404 });
    }

    // Customer authorization check (can only cancel own order)
    if (sessionUser.role === 'CUSTOMER') {
      const isOwner = order.userId === sessionUser.userId || order.customerEmail === sessionUser.email;
      if (!isOwner) {
        return NextResponse.json(ApiResponse.forbidden('You do not have permission to cancel this order'), { status: 403 });
      }
    }

    // Vendor authorization check (can only cancel own suborder)
    if (sessionUser.role === 'VENDOR') {
      if (!sessionUser.vendorId) {
        return NextResponse.json(ApiResponse.forbidden('Vendor access required'), { status: 403 });
      }
    }

    // Determine target sub-orders to cancel
    let targetSubOrders = order.subOrders;
    if (subOrderId) {
      targetSubOrders = order.subOrders.filter((s) => s.id === subOrderId);
      if (targetSubOrders.length === 0) {
        return NextResponse.json(ApiResponse.notFound('Sub-order not found'), { status: 404 });
      }
    }

    if (sessionUser.role === 'VENDOR') {
      targetSubOrders = targetSubOrders.filter((s) => s.vendorId === sessionUser.vendorId);
      if (targetSubOrders.length === 0) {
        return NextResponse.json(ApiResponse.forbidden('You do not have permission to cancel this sub-order'), { status: 403 });
      }
    }

    // State machine check: cannot cancel if any shipment is already PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, or DELIVERED
    const nonCancellableStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    for (const sub of targetSubOrders) {
      for (const shp of sub.shipments) {
        if (nonCancellableStatuses.includes((shp.status || '').toUpperCase())) {
          return NextResponse.json(
            ApiResponse.badRequest(
              `Sub-order #${sub.subOrderNumber} cannot be cancelled because shipment #${shp.awbNumber || shp.id} has already been dispatched (${shp.status}).`
            ),
            { status: 400 }
          );
        }
      }
    }

    // Perform atomic transaction for cancellation & refund handling
    const now = new Date();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update SubOrders & OrderItems
      for (const sub of targetSubOrders) {
        await tx.subOrder.update({
          where: { id: sub.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancellationReason,
            cancelledBy: sessionUser.role,
          },
        });

        await tx.orderItem.updateMany({
          where: { subOrderId: sub.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancellationReason,
          },
        });

        // Cancel pending shipments
        await tx.shipment.updateMany({
          where: { fulfillmentId: sub.id, status: { notIn: ['CANCELLED', 'DELIVERED'] } },
          data: { status: 'CANCELLED' },
        });
      }

      // 2. Fetch updated state of all subOrders
      const allSubOrders = await tx.subOrder.findMany({
        where: { orderId: order.id },
      });

      const allCancelled = allSubOrders.every((s) => s.status === 'CANCELLED');
      const someCancelled = allSubOrders.some((s) => s.status === 'CANCELLED');

      const aggregateStatus = allCancelled
        ? 'CANCELLED'
        : someCancelled
        ? 'PARTIALLY_CANCELLED'
        : order.aggregateStatus;

      // 3. Refund / Payment Status calculation
      let newPaymentStatus = order.paymentStatus;

      if (order.paymentMethod === 'COD') {
        // For COD orders, no online refund is required
        newPaymentStatus = allCancelled ? 'CANCELLED' : order.paymentStatus;
      } else if (order.paymentStatus === 'PAID') {
        // Calculate refundable amount for cancelled items
        const cancelledSubtotal = targetSubOrders.reduce((sum, s) => sum + s.subtotal, 0);

        if (cancelledSubtotal > 0) {
          // Create Refund record
          await tx.refund.create({
            data: {
              orderId: order.id,
              userId: sessionUser.userId,
              amount: cancelledSubtotal,
              method: 'ORIGINAL_PAYMENT_METHOD',
              status: 'COMPLETED',
              reason: cancellationReason,
              initiatedAt: now,
              completedAt: now,
            },
          });

          newPaymentStatus = allCancelled ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        }
      }

      // 4. Update master Order
      return tx.order.update({
        where: { id: order.id },
        data: {
          aggregateStatus,
          paymentStatus: newPaymentStatus,
          cancelledAt: allCancelled ? now : order.cancelledAt,
          cancellationReason: allCancelled ? cancellationReason : order.cancellationReason,
          cancelledBy: allCancelled ? sessionUser.role : order.cancelledBy,
        },
        include: {
          subOrders: {
            include: {
              items: { include: { product: true } },
              vendor: true,
              shipments: true,
            },
          },
          refunds: true,
        },
      });
    });

    return NextResponse.json(ApiResponse.success(updatedOrder, 'Order cancellation processed successfully'));
  } catch (err: any) {
    console.error('Order cancellation error:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
