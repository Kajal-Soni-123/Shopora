export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { isValidFulfillmentTransition } from '@/lib/shipping/fulfillmentLifecycle';
import { FulfillmentStatus } from '@/lib/shipping/types';

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
        shipments: {
          include: {
            trackingEvents: {
              orderBy: {
                eventTime: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

// PUT /api/vendor/orders - Update sub-order fulfillment status
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

    const existingSubOrder = await prisma.subOrder.findFirst({
      where: { id: subOrderId, vendorId: sessionUser.vendorId },
    });

    if (!existingSubOrder) {
      return ApiResponse.notFound('Sub-order not found or unauthorized.');
    }

    // Forbid vendors from manually setting courier-controlled statuses directly
    const courierControlledStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (status && courierControlledStatuses.includes(status.toUpperCase())) {
      return ApiResponse.badRequest(
        `Status '${status}' is controlled by the delivery courier. It will be updated automatically via shipment webhooks.`
      );
    }

    const currentStatus = existingSubOrder.status as FulfillmentStatus;
    const targetStatus = status as FulfillmentStatus;

    if (status && !isValidFulfillmentTransition(currentStatus, targetStatus)) {
      return ApiResponse.badRequest(
        `Invalid fulfillment status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions follow: PENDING -> CONFIRMED -> PROCESSING -> PACKED -> READY_FOR_PICKUP -> COMPLETED.`
      );
    }

    const updatedSubOrder = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: {
        status: targetStatus || existingSubOrder.status,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : existingSubOrder.trackingNumber,
        shippingCarrier: shippingCarrier !== undefined ? shippingCarrier : existingSubOrder.shippingCarrier,
      },
      include: {
        order: true,
        items: {
          include: {
            product: true,
          },
        },
        shipments: {
          include: {
            trackingEvents: true,
          },
        },
      },
    });

    return ApiResponse.success(updatedSubOrder, 'Fulfillment status updated successfully!');
  } catch (error) {
    console.error('Update vendor sub-order error:', error);
    return ApiResponse.serverError('Failed to update sub-order.');
  }
}
