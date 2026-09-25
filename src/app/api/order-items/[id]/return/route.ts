import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { checkReturnEligibility, calculateItemRefundAmount } from '@/lib/returns/returnService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(ApiResponse.unauthorized('Authentication required'), { status: 401 });
    }

    const orderItemId = params.id;
    const body = await req.json();
    const { reason, quantity, customerNote, images } = body as {
      reason: string;
      quantity?: number;
      customerNote?: string;
      images?: string[];
    };

    if (!reason) {
      return NextResponse.json(ApiResponse.badRequest('Return reason is required'), { status: 400 });
    }

    // Fetch orderItem with subOrder and master order
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        returnItems: true,
        subOrder: {
          include: {
            order: true,
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
    const isOwner = masterOrder.userId === sessionUser.userId || masterOrder.customerEmail === sessionUser.email;
    if (!isOwner && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(ApiResponse.forbidden('You do not have permission to return this item'), { status: 403 });
    }

    // Check return eligibility
    const eligibility = checkReturnEligibility(orderItem, subOrder);
    if (!eligibility.eligible) {
      return NextResponse.json(ApiResponse.badRequest(eligibility.reason || 'This item is not eligible for return'), { status: 400 });
    }

    const qtyToReturn = Math.min(quantity || 1, eligibility.maxReturnableQuantity);
    if (qtyToReturn <= 0) {
      return NextResponse.json(ApiResponse.badRequest('Requested quantity is invalid or exceeds return limit'), { status: 400 });
    }

    const refundAmount = calculateItemRefundAmount(orderItem.price, qtyToReturn);

    // Create ReturnRequest & ReturnItem in atomic transaction
    const returnRequest = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.returnRequest.create({
        data: {
          orderId: masterOrder.id,
          subOrderId: subOrder.id,
          vendorId: subOrder.vendorId,
          userId: sessionUser.userId,
          status: 'RETURN_REQUESTED',
          reason,
          customerNote: customerNote || null,
          images: images || [],
          refundAmount,
          returnItems: {
            create: [
              {
                orderItemId: orderItem.id,
                quantity: qtyToReturn,
                reason,
                refundAmount,
              },
            ],
          },
        },
        include: {
          returnItems: true,
          vendor: true,
        },
      });

      // Update OrderItem status to RETURN_REQUESTED
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { status: 'RETURN_REQUESTED' },
      });

      return createdRequest;
    });

    return NextResponse.json(ApiResponse.created(returnRequest, 'Return request submitted successfully'));
  } catch (err: any) {
    console.error('Create return request error:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
