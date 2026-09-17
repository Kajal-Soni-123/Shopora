import { NextResponse } from 'next/server';
import { CartItem as ClientCartItem, INITIAL_VENDORS, TrackingEvent } from '@/lib/data';
import { ApiResponse } from '@/lib/api-response';
import { groupItemsByVendor, generateTrackingNumber } from '@/lib/utils';
import { SHIPPING_CARRIERS, DEFAULT_VENDOR_FALLBACK } from '@/lib/constants';
import { sendOrderConfirmationSMS } from '@/lib/twilio';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// Helper: Add business days (skipping Sat/Sun)
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++; // Skip Sunday (0) and Saturday (6)
  }
  return result;
}

// Helper: Build initial status history for a new order
function buildInitialStatusHistory(createdAt: string): TrackingEvent[] {
  const base = new Date(createdAt);
  const confirmed = new Date(base.getTime() + 30 * 60 * 1000); // +30 min
  return [
    {
      status: 'PENDING',
      label: 'Order Placed',
      timestamp: base.toISOString(),
      note: 'Your order has been received successfully.',
      completed: true,
    },
    {
      status: 'CONFIRMED',
      label: 'Order Confirmed',
      timestamp: confirmed.toISOString(),
      note: 'Vendor has confirmed and is preparing your order.',
      completed: true,
    },
    {
      status: 'PACKED',
      label: 'Packed & Ready',
      timestamp: '',
      note: 'Items are packed and ready for pickup by courier.',
      completed: false,
    },
    {
      status: 'SHIPPED',
      label: 'Shipped',
      timestamp: '',
      note: 'Package is on its way to you.',
      completed: false,
    },
    {
      status: 'OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      timestamp: '',
      note: 'Your package is out for delivery today.',
      completed: false,
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      timestamp: '',
      note: 'Package delivered successfully. Enjoy your purchase!',
      completed: false,
    },
  ];
}

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
    } else if (sessionUser?.id) {
      whereClause.OR = [
        { userId: sessionUser.id },
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

    // Group items by vendorId
    const itemsByVendor = groupItemsByVendor(
      items,
      (item) => item.product.vendorId || DEFAULT_VENDOR_FALLBACK.id
    );

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const createdDate = new Date();
    const finalTransactionId = transactionId || 'pay_' + Math.random().toString(36).substring(2, 11);

    // Get list of valid vendor IDs from database or initial fallback
    const dbVendors = await prisma.vendor.findMany({ select: { id: true } });
    const validVendorIds = new Set(dbVendors.map((v) => v.id));

    let masterTotalAmount = 0;
    const subOrdersData: any[] = [];

    Object.entries(itemsByVendor).forEach(([vendorId, vendorItems], index) => {
      // Ensure vendorId is valid in DB, otherwise assign to first valid vendor or fallback
      const targetVendorId = validVendorIds.has(vendorId)
        ? vendorId
        : validVendorIds.values().next().value || DEFAULT_VENDOR_FALLBACK.id;

      let subtotal = 0;
      const orderItemsCreate = vendorItems.map((item) => {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;
        return {
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          selectedAttributes: item.product.attributes || null,
        };
      });

      masterTotalAmount += subtotal;

      const deliveryDays = 5 + (index % 3);
      const expectedDeliveryDate = addBusinessDays(createdDate, deliveryDays);

      subOrdersData.push({
        subOrderNumber: `${orderNumber}-SUB${index + 1}`,
        vendorId: targetVendorId,
        status: 'PENDING',
        subtotal,
        trackingNumber: generateTrackingNumber('Vendor'),
        shippingCarrier: SHIPPING_CARRIERS[index % SHIPPING_CARRIERS.length],
        expectedDelivery: expectedDeliveryDate.toISOString(),
        statusHistory: buildInitialStatusHistory(createdDate.toISOString()),
        items: {
          create: orderItemsCreate,
        },
      });
    });

    // Save master order and sub-orders in PostgreSQL via Prisma
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId: sessionUser?.id || null,
        customerName: customerName || sessionUser?.name || 'Customer',
        customerEmail: customerEmail || sessionUser?.email || 'customer@shopora.com',
        customerPhone: customerPhone || sessionUser?.phone || null,
        shippingAddress: shippingAddress || sessionUser?.homeAddress || 'Standard Delivery Address',
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        paymentStatus: 'PAID',
        transactionId: finalTransactionId,
        paymentDetails: (paymentDetails as any) || {
          method: paymentMethod || 'CREDIT_CARD',
          maskedDetails: '•••• 4242',
          provider: 'Shopora Pay',
        },
        totalAmount: masterTotalAmount,
        aggregateStatus: 'PENDING',
        subOrders: {
          create: subOrdersData,
        },
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

    // Trigger SMS/WhatsApp notification if phone is present
    if (newOrder.customerPhone) {
      sendOrderConfirmationSMS(newOrder.customerPhone, {
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        totalAmount: newOrder.totalAmount,
        itemCount: items.length,
        subOrderCount: newOrder.subOrders.length,
      }).catch((err) => console.error('Background Twilio SMS Error:', err));
    }

    // Format final object for client
    const formattedOrder = {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: newOrder.customerName,
      customerEmail: newOrder.customerEmail,
      customerPhone: newOrder.customerPhone || undefined,
      shippingAddress: newOrder.shippingAddress,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      transactionId: newOrder.transactionId || undefined,
      paymentDetails: newOrder.paymentDetails || undefined,
      totalAmount: newOrder.totalAmount,
      aggregateStatus: newOrder.aggregateStatus,
      createdAt: newOrder.createdAt.toISOString(),
      subOrders: newOrder.subOrders.map((sub) => ({
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

    return ApiResponse.created({ order: formattedOrder }, 'Order created and saved in database successfully');
  } catch (error) {
    console.error('Order creation error:', error);
    return ApiResponse.serverError('Failed to create order', error);
  }
}
