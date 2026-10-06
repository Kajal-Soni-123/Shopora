import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deriveAggregateOrderStatus } from '@/lib/shipping/fulfillmentLifecycle';
import { ShipmentStatus } from '@/lib/shipping/types';

/**
 * Apply one shipment status event and keep everything in sync: tracking event,
 * shipment status/timestamps, the vendor sub-order, the parent order's aggregate
 * status and COD collection. Used by courier webhooks, the dev courier simulator
 * and seller self-delivery, so all three behave identically.
 */
export interface ShipmentEventInput {
  shipmentId: string;
  status: ShipmentStatus;
  description: string;
  location?: string;
  eventTime?: Date;
  providerEvent?: string;
  rawPayload?: Prisma.InputJsonValue;
  /** COD orders: whether the courier/seller collected the cash on delivery */
  cashCollected?: boolean;
  amountCollected?: number;
}

export async function applyShipmentEvent(input: ShipmentEventInput) {
  const eventTime = input.eventTime || new Date();

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
      include: { fulfillment: { include: { order: true } } },
    });

    const newEvent = await tx.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        status: input.status,
        location: input.location || null,
        description: input.description,
        eventTime,
        providerEvent: input.providerEvent || input.status,
        rawPayload: input.rawPayload ?? Prisma.DbNull,
      },
    });

    const shipmentData: Prisma.ShipmentUpdateInput = { status: input.status };
    if (input.status === 'PICKED_UP' && !shipment.pickedUpAt) shipmentData.pickedUpAt = eventTime;
    if (input.status === 'DELIVERED' && !shipment.deliveredAt) shipmentData.deliveredAt = eventTime;
    const updatedShipment = await tx.shipment.update({ where: { id: shipment.id }, data: shipmentData });

    // Sub-order follows the shipment
    let subOrderStatus = shipment.fulfillment.status;
    if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(input.status)) subOrderStatus = 'SHIPPED';
    else if (input.status === 'DELIVERED') subOrderStatus = 'DELIVERED';
    else if (input.status === 'CANCELLED') subOrderStatus = 'CANCELLED';
    await tx.subOrder.update({ where: { id: shipment.fulfillmentId }, data: { status: subOrderStatus } });

    // Parent order aggregate status (+ COD collection on delivery)
    const allSubOrders = await tx.subOrder.findMany({
      where: { orderId: shipment.fulfillment.orderId },
      select: { status: true },
    });
    const aggregateStatus = deriveAggregateOrderStatus(allSubOrders.map((s) => s.status));

    const order = shipment.fulfillment.order;
    let paymentStatus = order.paymentStatus;
    let codCollectedAmount = order.codCollectedAmount;
    if (input.status === 'DELIVERED' && order.paymentMethod === 'COD') {
      const collected = input.cashCollected ?? true;
      const amount = input.amountCollected ?? order.totalAmount;
      if (collected && amount >= order.totalAmount - 0.01) {
        paymentStatus = 'COD_COLLECTED';
        codCollectedAmount = amount;
      }
    }
    await tx.order.update({
      where: { id: order.id },
      data: { aggregateStatus, paymentStatus, codCollectedAmount },
    });

    return { updatedShipment, newEvent, aggregateStatus };
  });
}

/**
 * Timestamps for `count` new events, one second apart, always after the shipment's latest
 * event — so a timeline reads in order even when steps are applied in quick succession.
 */
export async function nextEventTimes(shipmentId: string, count: number): Promise<Date[]> {
  const latest = await prisma.trackingEvent.findFirst({
    where: { shipmentId },
    orderBy: { eventTime: 'desc' },
    select: { eventTime: true },
  });
  const start = Math.max(Date.now() - (count - 1) * 1000, (latest?.eventTime.getTime() ?? 0) + 1000);
  return Array.from({ length: count }, (_, i) => new Date(start + i * 1000));
}

/** Remove the self-delivery code before a shipment is sent to anyone but the customer. */
export function stripDeliveryOtp<T extends { deliveryOtp?: string | null }>(shipment: T): Omit<T, 'deliveryOtp'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deliveryOtp, ...rest } = shipment;
  return rest;
}
