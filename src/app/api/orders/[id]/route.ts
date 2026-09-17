import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return ApiResponse.badRequest('Order ID is required');
    }

    const sessionUser = await getSessionUser();

    // Query order by ID or orderNumber
    const ord = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { orderNumber: id },
        ],
      },
      include: {
        subOrders: {
          include: {
            vendor: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!ord) {
      return ApiResponse.notFound('Order not found');
    }

    // Format DB response
    const formattedOrder = {
      id: ord.id,
      orderNumber: ord.orderNumber,
      customerName: ord.customerName,
      customerEmail: ord.customerEmail,
      customerPhone: ord.customerPhone || undefined,
      shippingAddress: ord.shippingAddress,
      paymentMethod: ord.paymentMethod,
      paymentStatus: ord.paymentStatus,
      transactionId: ord.transactionId || undefined,
      paymentDetails: ord.paymentDetails || undefined,
      totalAmount: ord.totalAmount,
      aggregateStatus: ord.aggregateStatus,
      createdAt: ord.createdAt.toISOString(),
      subOrders: ord.subOrders.map((sub) => ({
        id: sub.id,
        subOrderNumber: sub.subOrderNumber,
        vendorId: sub.vendorId,
        vendor: sub.vendor,
        status: sub.status,
        subtotal: sub.subtotal,
        trackingNumber: sub.trackingNumber,
        shippingCarrier: sub.shippingCarrier,
        expectedDelivery: sub.expectedDelivery || undefined,
        statusHistory: (sub.statusHistory as any) || [],
        createdAt: sub.createdAt.toISOString(),
        items: sub.items.map((item) => ({
          product: {
            ...item.product,
            attributes: (item.selectedAttributes as any) || item.product.attributes,
          },
          quantity: item.quantity,
          price: item.price,
        })),
      })),
    };

    return ApiResponse.success(formattedOrder);
  } catch (error) {
    console.error('Fetch order detail error:', error);
    return ApiResponse.serverError('Failed to fetch order detail', error);
  }
}
