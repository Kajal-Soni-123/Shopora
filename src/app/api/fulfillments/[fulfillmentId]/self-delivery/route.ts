export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { randomInt } from 'crypto';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { applyShipmentEvent, nextEventTimes, stripDeliveryOtp } from '@/lib/shipping/applyShipmentUpdate';

/**
 * POST /api/fulfillments/[fulfillmentId]/self-delivery — the seller delivers the package
 * themselves instead of booking a courier.
 *   action 'DISPATCH'         → package leaves the seller (shipment created, customer gets a delivery code)
 *   action 'OUT_FOR_DELIVERY' → on the way to the customer's door
 *   action 'DELIVER'          → handed over; requires the customer's 6-digit delivery code
 *                               (and confirmation that cash was collected for COD orders)
 */
const DISPATCHABLE = ['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP'];

export async function POST(req: NextRequest, { params }: { params: { fulfillmentId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'VENDOR' || !user.vendorId) return ApiResponse.unauthorized('Vendor login required.');

    const { action, otp, cashCollected } = await req.json();
    const subOrder = await prisma.subOrder.findFirst({
      where: { id: params.fulfillmentId, vendorId: user.vendorId },
      include: { order: true, shipments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!subOrder) return ApiResponse.notFound('Sub-order not found or unauthorized.');

    const active = subOrder.shipments.find((s) => s.status !== 'CANCELLED');
    let shipmentId: string;

    if (action === 'DISPATCH') {
      if (!DISPATCHABLE.includes(subOrder.status)) {
        return ApiResponse.badRequest(`This order can't be dispatched while it is ${subOrder.status.toLowerCase()}.`);
      }
      if (active) {
        return ApiResponse.badRequest('A courier shipment already exists for this order — continue with the courier instead.');
      }
      const reference = `SELF-${randomInt(100000, 1000000)}`;
      const shipment = await prisma.shipment.create({
        data: {
          fulfillmentId: subOrder.id,
          provider: 'self',
          awbNumber: reference,
          status: 'PICKUP_SCHEDULED',
          pickupScheduledAt: new Date(),
          deliveryOtp: String(randomInt(100000, 1000000)),
        },
      });
      await prisma.subOrder.update({
        where: { id: subOrder.id },
        data: { trackingNumber: reference, shippingCarrier: 'Seller delivery' },
      });
      shipmentId = shipment.id;
      const [dispatchedAt, inTransitAt] = await nextEventTimes(shipmentId, 2);
      await applyShipmentEvent({
        shipmentId,
        status: 'PICKED_UP',
        description: 'Packed and dispatched by the seller',
        location: 'Seller store',
        eventTime: dispatchedAt,
        providerEvent: 'SELF_DISPATCHED',
      });
      await applyShipmentEvent({
        shipmentId,
        status: 'IN_TRANSIT',
        description: 'On the way — the seller is delivering this order personally',
        location: 'With the seller',
        eventTime: inTransitAt,
        providerEvent: 'SELF_IN_TRANSIT',
      });
    } else if (action === 'OUT_FOR_DELIVERY' || action === 'DELIVER') {
      if (!active || active.provider !== 'self') return ApiResponse.badRequest('This order is not being delivered by the seller.');
      if (!['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(active.status)) {
        return ApiResponse.badRequest(`This delivery is already ${active.status.toLowerCase().replace(/_/g, ' ')}.`);
      }
      shipmentId = active.id;

      if (action === 'DELIVER') {
        if (!otp || String(otp).trim() !== active.deliveryOtp) {
          return ApiResponse.badRequest(
            "That code doesn't match. Ask the customer for the 6-digit delivery code shown on their order page."
          );
        }
        const isCod = subOrder.order.paymentMethod === 'COD';
        if (isCod && !cashCollected) {
          return ApiResponse.badRequest('This is a Cash on Delivery order — collect the payment and confirm it before completing delivery.');
        }
        const times = await nextEventTimes(shipmentId, active.status === 'IN_TRANSIT' ? 2 : 1);
        if (active.status === 'IN_TRANSIT') {
          await applyShipmentEvent({
            shipmentId,
            status: 'OUT_FOR_DELIVERY',
            description: 'Out for delivery with the seller',
            location: 'Near customer address',
            eventTime: times[0],
            providerEvent: 'SELF_OUT_FOR_DELIVERY',
          });
        }
        await applyShipmentEvent({
          shipmentId,
          status: 'DELIVERED',
          description: isCod ? 'Delivered by the seller — cash collected, delivery code verified' : 'Delivered by the seller — delivery code verified',
          location: 'Customer address',
          eventTime: times[times.length - 1],
          providerEvent: 'SELF_DELIVERED',
          cashCollected: isCod ? true : undefined,
        });
      } else {
        if (active.status !== 'IN_TRANSIT') return ApiResponse.badRequest('This delivery is already out for delivery.');
        await applyShipmentEvent({
          shipmentId,
          status: 'OUT_FOR_DELIVERY',
          description: 'Out for delivery with the seller',
          location: 'Near customer address',
          eventTime: (await nextEventTimes(shipmentId, 1))[0],
          providerEvent: 'SELF_OUT_FOR_DELIVERY',
        });
      }
    } else {
      return ApiResponse.badRequest("action must be 'DISPATCH', 'OUT_FOR_DELIVERY' or 'DELIVER'.");
    }

    const updated = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: { trackingEvents: { orderBy: { eventTime: 'asc' } } },
    });
    return ApiResponse.success(stripDeliveryOtp(updated));
  } catch (error: any) {
    console.error('Self-delivery error:', error);
    return ApiResponse.serverError('Failed to update self-delivery', error?.message);
  }
}
