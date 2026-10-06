export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CartItem as ClientCartItem } from '@/lib/data';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { createOrderRecord, orderTotal } from '@/lib/orders/createOrder';
import { getSessionUser } from '@/lib/auth';
import { checkCodAvailability } from '@/lib/shipping/codService';

// GET /api/orders - Fetch customer order history from PostgreSQL DB
export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');
    const orderNumber = searchParams.get('orderNumber');

    let whereClause: any = {};

    if (orderNumber) {
      whereClause.orderNumber = orderNumber;
    } else if (sessionUser?.userId) {
      whereClause.OR = [
        { userId: sessionUser.userId },
        { customerEmail: sessionUser.email },
      ];
    } else if (queryEmail) {
      whereClause.customerEmail = queryEmail;
    } else {
      // Return empty array if not authenticated and no search query provided
      return ApiResponse.success([]);
    }

    const dbOrders = await prisma.order.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    });

    // Format DB response for frontend consumption
    const formattedOrders = dbOrders.map((ord) => ({
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
          id: item.id,
          status: item.status,
          product: {
            ...item.product,
            attributes: (item.selectedAttributes as any) || item.product.attributes,
          },
          quantity: item.quantity,
          price: item.price,
        })),
      })),
    }));

    return ApiResponse.success(formattedOrders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    return ApiResponse.serverError('Failed to fetch orders', error);
  }
}

// POST /api/orders - Create and persist order into PostgreSQL DB via Prisma
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    const body = await request.json();
    const { items, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, transactionId, paymentDetails } = body as {
      items: ClientCartItem[];
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: string;
      paymentMethod: string;
      transactionId?: string;
      paymentDetails?: {
        method: string;
        maskedDetails: string;
        provider?: string;
      };
    };

    if (!items || items.length === 0) {
      return ApiResponse.badRequest('Cart is empty. Please add items before checking out.');
    }

    const masterTotalAmount = orderTotal(items);

    // Check COD validation if paymentMethod is COD
    const isCod = (paymentMethod || '').toUpperCase() === 'COD';
    let isCodAllowed = true;
    let codCheckReason = '';

    if (isCod) {
      const dbVendors = await prisma.vendor.findMany({ select: { id: true } });
      const validVendorIds = new Set(dbVendors.map((v) => v.id));
      // Extract pincode from shipping address (e.g. 6-digit number at end or in text)
      const pincodeMatch = (shippingAddress || '').match(/\b\d{6}\b/);
      const pincode = pincodeMatch ? pincodeMatch[0] : '400001';

      const codValidation = await checkCodAvailability({
        pincode,
        orderAmount: masterTotalAmount,
        vendorIds: Array.from(validVendorIds),
      });

      if (!codValidation.allowed) {
        return ApiResponse.badRequest(codValidation.reason || 'Cash on Delivery is unavailable for this order.');
      }
    }

    const initialPaymentStatus = isCod ? 'COD_PENDING' : 'PAID';
    const finalTransactionId = isCod
      ? 'cod_' + Math.random().toString(36).substring(2, 11)
      : transactionId || 'pay_' + Math.random().toString(36).substring(2, 11);

    const formattedOrder = await createOrderRecord({
      items,
      userId: sessionUser?.userId || null,
      customerName: customerName || sessionUser?.name || 'Customer',
      customerEmail: customerEmail || sessionUser?.email || 'customer@shopora.com',
      customerPhone: customerPhone || null,
      shippingAddress: shippingAddress || 'Standard Delivery Address',
      paymentMethod: isCod ? 'COD' : paymentMethod || 'CREDIT_CARD',
      paymentStatus: initialPaymentStatus,
      codAmount: isCod ? masterTotalAmount : null,
      transactionId: finalTransactionId,
      paymentDetails: (paymentDetails as any) || {
        method: isCod ? 'COD' : paymentMethod || 'CREDIT_CARD',
        maskedDetails: isCod ? 'Cash on Delivery' : '•••• 4242',
        provider: isCod ? 'Pay on Delivery' : 'Shopora Pay',
      },
    });

    return ApiResponse.created({ order: formattedOrder }, 'Order created and saved in database successfully');
  } catch (error) {
    console.error('Order creation error:', error);
    return ApiResponse.serverError('Failed to create order', error);
  }
}
