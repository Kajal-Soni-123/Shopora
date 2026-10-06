import { groupItemsByVendor, generateTrackingNumber } from '@/lib/utils';
import { SHIPPING_CARRIERS, DEFAULT_VENDOR_FALLBACK } from '@/lib/constants';
import { sendOrderConfirmationSMS } from '@/lib/twilio';
import { prisma } from '@/lib/prisma';
import { TrackingEvent } from '@/lib/data';

/**
 * Shared order creation (master order + one sub-order per vendor), used by the normal
 * checkout (POST /api/orders) and by group checkout once every share is paid.
 */

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

export interface OrderLineInput {
  product: { id: string; price: number; vendorId?: string | null; attributes?: unknown };
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderLineInput[];
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId: string;
  paymentDetails: unknown;
  codAmount?: number | null;
}

export const orderTotal = (items: OrderLineInput[]) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

export async function createOrderRecord(input: CreateOrderInput) {
  const { items } = input;

  // Group items by vendorId
  const itemsByVendor = groupItemsByVendor(
    items,
    (item) => item.product.vendorId || DEFAULT_VENDOR_FALLBACK.id
  );

  const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const createdDate = new Date();

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
  const newOrder: any = await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone || null,
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      codAmount: input.codAmount ?? null,
      transactionId: input.transactionId,
      paymentDetails: input.paymentDetails as any,
      totalAmount: masterTotalAmount,
      aggregateStatus: 'PENDING',
      subOrders: {
        create: subOrdersData,
      },
    } as any,
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
    sendOrderConfirmationSMS(
      newOrder.customerPhone,
      {
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        totalAmount: newOrder.totalAmount,
        itemCount: items.length,
        subOrderCount: newOrder.subOrders.length,
      },
      'WHATSAPP'
    ).catch((err) => console.error('Background Twilio WhatsApp Error:', err));
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
    subOrders: newOrder.subOrders.map((sub: any) => ({
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
      items: sub.items.map((item: any) => ({
        product: {
          ...item.product,
          attributes: (item.selectedAttributes as any) || item.product.attributes,
        },
        quantity: item.quantity,
        price: item.price,
      })),
    })),
  };

  return formattedOrder;
}
