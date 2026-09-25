export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDeliveryProvider } from '@/lib/shipping/ProviderFactory';

export async function POST(
  req: NextRequest,
  { params }: { params: { fulfillmentId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return ApiResponse.unauthorized('Authentication required to create shipment');
    }

    const { fulfillmentId } = params;
    if (!fulfillmentId) {
      return ApiResponse.badRequest('Fulfillment ID is required');
    }

    // 1. Fetch SubOrder (fulfillment) with order, items, vendor
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: fulfillmentId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
        vendor: true,
        items: {
          include: {
            product: true,
          },
        },
        shipments: {
          where: {
            status: {
              not: 'CANCELLED',
            },
          },
        },
      },
    });

    if (!subOrder) {
      return ApiResponse.notFound('Fulfillment (SubOrder) not found');
    }

    // 2. Authorization Guard: Vendor can only create shipments for their own fulfillment
    if (user.role === 'VENDOR' && user.vendorId !== subOrder.vendorId) {
      return ApiResponse.forbidden('Access denied: You cannot create shipments for another vendor');
    }

    // 3. Prevent duplicate shipment creation
    if (subOrder.shipments && subOrder.shipments.length > 0) {
      return ApiResponse.badRequest('A shipment already exists for this fulfillment', {
        existingShipment: subOrder.shipments[0],
      });
    }

    // 4. Validate fulfillment status eligibility
    const validStatusesForShipment = ['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP'];
    if (!validStatusesForShipment.includes(subOrder.status.toUpperCase())) {
      return ApiResponse.badRequest(
        `Fulfillment status '${subOrder.status}' is not eligible for shipment creation. Status must be PACKED or READY_FOR_PICKUP.`
      );
    }

    // Parse request body for custom weight/dimensions if provided
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    const weight = typeof body.weight === 'number' ? body.weight : 0.5;
    const length = typeof body.length === 'number' ? body.length : 10.0;
    const breadth = typeof body.breadth === 'number' ? body.breadth : 10.0;
    const height = typeof body.height === 'number' ? body.height : 10.0;

    // Build pickup and delivery address objects
    const pickupAddress = {
      name: subOrder.vendor.name,
      email: subOrder.vendor.email,
      address: subOrder.vendor.warehouseLocation || 'Central Vendor Hub',
      pincode: '110001',
    };

    const deliveryAddress = {
      name: subOrder.order.customerName,
      email: subOrder.order.customerEmail,
      phone: subOrder.order.customerPhone || undefined,
      address: subOrder.order.shippingAddress,
      pincode: '400001', // Extracted or fallback
    };

    const shipmentItems = subOrder.items.map((item) => ({
      name: item.product.title,
      quantity: item.quantity,
      price: item.price,
    }));

    // 5. Invoke Delivery Provider
    const provider = getDeliveryProvider();
    const providerResult = await provider.createShipment({
      fulfillmentId: subOrder.id,
      orderNumber: subOrder.order.orderNumber,
      subOrderNumber: subOrder.subOrderNumber,
      vendorId: subOrder.vendorId,
      pickupAddress,
      deliveryAddress,
      items: shipmentItems,
      dimensions: { weight, length, breadth, height },
      paymentMethod: subOrder.order.paymentMethod,
      totalAmount: subOrder.subtotal,
    });

    // 6. Create Shipment record & TrackingEvent in DB transaction
    const newShipment = await prisma.$transaction(async (tx) => {
      const createdShipment = await tx.shipment.create({
        data: {
          fulfillmentId: subOrder.id,
          provider: providerResult.provider,
          providerOrderId: providerResult.providerOrderId,
          providerShipmentId: providerResult.providerShipmentId,
          awbNumber: providerResult.awbNumber,
          trackingUrl: providerResult.trackingUrl,
          status: 'CREATED',
          weight,
          length,
          breadth,
          height,
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: createdShipment.id,
          status: 'CREATED',
          location: pickupAddress.address,
          description: `Shipment created via ${providerResult.provider.toUpperCase()} (AWB: ${providerResult.awbNumber})`,
          eventTime: new Date(),
          providerEvent: 'SHIPMENT_MANIFESTED',
          rawPayload: providerResult as any,
        },
      });

      // Update SubOrder status to READY_FOR_PICKUP
      await tx.subOrder.update({
        where: { id: subOrder.id },
        data: {
          status: 'READY_FOR_PICKUP',
          trackingNumber: providerResult.awbNumber,
          shippingCarrier: providerResult.provider.toUpperCase(),
        },
      });

      return createdShipment;
    });

    return ApiResponse.created(newShipment, 'Shipment created successfully');
  } catch (err: any) {
    console.error('Error creating shipment:', err);
    return ApiResponse.serverError('Failed to create shipment', err.message);
  }
}
