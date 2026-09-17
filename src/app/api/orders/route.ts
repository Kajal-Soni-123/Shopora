import { CartItem, Order, SubOrder, INITIAL_VENDORS } from '@/lib/data';
import { ApiResponse } from '@/lib/api-response';
import { groupItemsByVendor, generateTrackingNumber } from '@/lib/utils';
import { SHIPPING_CARRIERS, DEFAULT_VENDOR_FALLBACK } from '@/lib/constants';
import { sendOrderConfirmationSMS } from '@/lib/twilio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, transactionId, paymentDetails } = body as {
      items: CartItem[];
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

    // Group items by vendorId for Sub-Order partitioning using common utility helper
    const itemsByVendor = groupItemsByVendor(
      items,
      (item) => item.product.vendorId || DEFAULT_VENDOR_FALLBACK.id
    );

    const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const createdDate = new Date().toISOString();
    const finalTransactionId = transactionId || 'pay_' + Math.random().toString(36).substring(2, 11);

    const subOrders: SubOrder[] = [];
    let totalAmount = 0;

    // Create Sub-Orders per vendor
    Object.entries(itemsByVendor).forEach(([vendorId, vendorItems], index) => {
      const vendor =
        INITIAL_VENDORS.find((v) => v.id === vendorId) || {
          ...DEFAULT_VENDOR_FALLBACK,
          id: vendorId,
        };

      let subtotal = 0;
      const formattedItems = vendorItems.map((item) => {
        const itemTotal = item.product.price * item.quantity;
        subtotal += itemTotal;
        return {
          product: item.product,
          quantity: item.quantity,
          price: item.product.price,
        };
      });

      totalAmount += subtotal;

      const subOrder: SubOrder = {
        id: `sub_${orderId}_${vendorId}`,
        subOrderNumber: `${orderNumber}-SUB${index + 1}`,
        vendorId,
        vendor,
        status: 'PROCESSING',
        subtotal,
        trackingNumber: generateTrackingNumber(vendor.name),
        shippingCarrier: SHIPPING_CARRIERS[index % SHIPPING_CARRIERS.length],
        items: formattedItems,
        createdAt: createdDate,
      };

      subOrders.push(subOrder);
    });

    const masterOrder: Order = {
      id: orderId,
      orderNumber,
      customerName: customerName || 'Alex Morgan',
      customerEmail: customerEmail || 'alex.morgan@example.com',
      customerPhone: customerPhone || '+1 555-019-2834',
      shippingAddress: shippingAddress || '742 Evergreen Terrace, Seattle, WA 98101',
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      paymentStatus: 'PAID',
      transactionId: finalTransactionId,
      paymentDetails: paymentDetails || {
        method: paymentMethod || 'CREDIT_CARD',
        maskedDetails: '•••• 4242',
        provider: 'Shopora Pay',
      },
      totalAmount,
      aggregateStatus: 'PROCESSING',
      subOrders,
      createdAt: createdDate,
    };

    // Trigger Twilio SMS / WhatsApp Order Notification (Async, non-blocking)
    if (masterOrder.customerPhone) {
      sendOrderConfirmationSMS(masterOrder.customerPhone, {
        orderNumber: masterOrder.orderNumber,
        customerName: masterOrder.customerName,
        totalAmount: masterOrder.totalAmount,
        itemCount: items.length,
        subOrderCount: subOrders.length,
      }).catch((err) => console.error('Background Twilio SMS Error:', err));
    }

    return ApiResponse.created({ order: masterOrder }, 'Order created and partitioned successfully');
  } catch (error) {
    console.error('Order creation error:', error);
    return ApiResponse.serverError('Failed to create order', error);
  }
}
