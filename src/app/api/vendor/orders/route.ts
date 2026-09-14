import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// GET /api/vendor/orders - Fetch sub-orders assigned to the logged-in vendor
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const subOrders = await prisma.subOrder.findMany({
      where: { vendorId: sessionUser.vendorId },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            shippingAddress: true,
            paymentStatus: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(subOrders);
  } catch (error) {
    console.error('Fetch vendor sub-orders error:', error);
    return ApiResponse.serverError('Failed to fetch sub-orders.');
  }
}

// PUT /api/vendor/orders - Update sub-order fulfillment status and tracking details
export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const body = await request.json();
    const { subOrderId, status, trackingNumber, shippingCarrier } = body;

    if (!subOrderId || typeof subOrderId !== 'string') {
      return ApiResponse.badRequest('subOrderId is required.');
    }

    // Verify sub-order belongs to vendor
    const existingSubOrder = await prisma.subOrder.findFirst({
      where: { id: subOrderId, vendorId: sessionUser.vendorId },
    });

    if (!existingSubOrder) {
      return ApiResponse.notFound('Sub-order not found or unauthorized.');
    }

    const updatedSubOrder = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        status: status || 'SHIPPED',
        trackingNumber: trackingNumber || existingSubOrder.trackingNumber,
        shippingCarrier: shippingCarrier || existingSubOrder.shippingCarrier,
      },
      include: {
        order: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return ApiResponse.success(updatedSubOrder, 'Sub-order status updated successfully!');
  } catch (error) {
    console.error('Update vendor sub-order error:', error);
    return ApiResponse.serverError('Failed to update sub-order.');
  }
}
