import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { getDeliveryProvider } from '@/lib/shipping/ProviderFactory';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(ApiResponse.unauthorized('Authentication required'), { status: 401 });
    }

    if (sessionUser.role !== 'VENDOR' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(ApiResponse.forbidden('Vendor or admin authorization required'), { status: 403 });
    }

    const returnRequestId = params.id;
    const action = params.action.toLowerCase();
    const body = await req.json().catch(() => ({}));
    const { note } = body as { note?: string };

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        vendor: true,
        order: true,
        subOrder: true,
        returnItems: true,
      },
    });

    if (!returnRequest) {
      return NextResponse.json(ApiResponse.notFound('Return request not found'), { status: 404 });
    }

    if (sessionUser.role === 'VENDOR' && returnRequest.vendorId !== sessionUser.vendorId) {
      return NextResponse.json(ApiResponse.forbidden('Vendor isolation check failed'), { status: 403 });
    }

    const now = new Date();

    if (action === 'approve') {
      // 1. Vendor Approve Return & Schedule Reverse Pickup
      if (returnRequest.status !== 'RETURN_REQUESTED' && returnRequest.status !== 'UNDER_REVIEW') {
        return NextResponse.json(
          ApiResponse.badRequest(`Cannot approve return request in current state: ${returnRequest.status}`),
          { status: 400 }
        );
      }

      // Generate reverse shipment via provider
      const provider = getDeliveryProvider();
      const reverseResult = await provider.createReverseShipment({
        returnRequestId: returnRequest.id,
        orderNumber: returnRequest.order.orderNumber,
        subOrderNumber: returnRequest.subOrder.subOrderNumber,
        customerAddress: {
          name: returnRequest.order.customerName,
          email: returnRequest.order.customerEmail,
          phone: returnRequest.order.customerPhone || undefined,
          address: returnRequest.order.shippingAddress,
          pincode: '400001',
        },
        vendorAddress: {
          name: returnRequest.vendor.name,
          email: returnRequest.vendor.email,
          address: returnRequest.vendor.warehouseLocation,
          pincode: '400001',
        },
        items: returnRequest.returnItems.map((ri) => ({
          name: 'Returned Item',
          quantity: ri.quantity,
        })),
      });

      const updated = await prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: 'APPROVED',
          approvedAt: now,
          reverseAwb: reverseResult.reverseAwb,
          adminNote: note || returnRequest.adminNote,
        },
        include: { returnItems: true, vendor: true, order: true },
      });

      return NextResponse.json(ApiResponse.success(updated, 'Return request approved and reverse pickup scheduled'));
    }

    if (action === 'reject') {
      // 2. Vendor Reject Return Request
      if (returnRequest.status === 'COMPLETED' || returnRequest.status === 'RECEIVED') {
        return NextResponse.json(ApiResponse.badRequest('Cannot reject a completed or received return'), { status: 400 });
      }

      const updated = await prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: 'REJECTED',
          rejectedAt: now,
          adminNote: note || 'Return request rejected by vendor',
        },
        include: { returnItems: true, vendor: true, order: true },
      });

      return NextResponse.json(ApiResponse.success(updated, 'Return request rejected'));
    }

    if (action === 'receive') {
      // 3. Vendor Mark Item Received at Warehouse
      const updated = await prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: 'RECEIVED',
          receivedAt: now,
          adminNote: note || returnRequest.adminNote,
        },
        include: { returnItems: true, vendor: true, order: true },
      });

      return NextResponse.json(ApiResponse.success(updated, 'Return marked as received at vendor warehouse'));
    }

    if (action === 'refund') {
      // 4. Vendor Approve Refund & Complete Return
      const result = await prisma.$transaction(async (tx) => {
        // Create Refund record
        const refund = await tx.refund.create({
          data: {
            orderId: returnRequest.orderId,
            subOrderId: returnRequest.subOrderId,
            returnRequestId: returnRequest.id,
            userId: returnRequest.userId,
            amount: returnRequest.refundAmount,
            method: returnRequest.order.paymentMethod === 'COD' ? 'MANUAL' : 'ORIGINAL_PAYMENT_METHOD',
            status: 'COMPLETED',
            reason: `Return refund for #${returnRequest.returnNumber}`,
            initiatedAt: now,
            completedAt: now,
          },
        });

        // Update ReturnRequest to COMPLETED
        const updatedReturn = await tx.returnRequest.update({
          where: { id: returnRequestId },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            adminNote: note || returnRequest.adminNote,
          },
          include: { returnItems: true, vendor: true, order: true, refunds: true },
        });

        // Update OrderItem status to RETURNED
        for (const item of returnRequest.returnItems) {
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: { status: 'RETURNED' },
          });
        }

        return updatedReturn;
      });

      return NextResponse.json(ApiResponse.success(result, 'Refund issued and return request completed'));
    }

    return NextResponse.json(ApiResponse.badRequest(`Unknown action: ${action}`), { status: 400 });
  } catch (err: any) {
    console.error('Vendor return action error:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
