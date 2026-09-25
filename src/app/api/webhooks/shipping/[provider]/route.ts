import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { mapProviderStatusToInternal } from '@/lib/shipping/statusMapper';
import { deriveAggregateOrderStatus } from '@/lib/shipping/fulfillmentLifecycle';

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const providerName = params.provider.toLowerCase();
    const body = await req.json();

    const awbNumber = body.awbNumber || body.awb_number || body.awb || body.tracking_number;
    const providerShipmentId = body.providerShipmentId || body.shipment_id || body.provider_shipment_id;
    const rawStatus = body.status || body.current_status || body.event;
    const location = body.location || body.hub || body.city || 'Courier Sortation Hub';
    const description = body.description || body.activity || `Shipment status updated to ${rawStatus}`;
    const eventTimeStr = body.eventTime || body.timestamp || new Date().toISOString();

    if (!awbNumber && !providerShipmentId) {
      return ApiResponse.badRequest('Webhook payload must contain awbNumber or providerShipmentId');
    }

    // 1. Locate shipment in DB
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { awbNumber: awbNumber || undefined },
          { providerShipmentId: providerShipmentId || undefined },
        ],
      },
      include: {
        fulfillment: {
          include: {
            order: {
              include: {
                subOrders: true,
              },
            },
          },
        },
        trackingEvents: true,
      },
    });

    if (!shipment) {
      return ApiResponse.notFound(`No shipment found matching AWB: ${awbNumber || providerShipmentId}`);
    }

    // 2. Map provider status to internal ShipmentStatus
    const targetStatus = mapProviderStatusToInternal(providerName, rawStatus);
    const eventTime = new Date(eventTimeStr);

    // 3. IDEMPOTENCY CHECK: Check if an identical event already exists
    const isDuplicate = shipment.trackingEvents.some(
      (evt) =>
        evt.status === targetStatus &&
        Math.abs(new Date(evt.eventTime).getTime() - eventTime.getTime()) < 2000
    );

    if (isDuplicate) {
      return ApiResponse.success(
        { shipmentId: shipment.id, awbNumber: shipment.awbNumber, status: shipment.status, duplicate: true },
        'Webhook payload already processed (Idempotent OK)'
      );
    }

    // 4. Process Status Update & Sync SubOrder / Order status in DB transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new TrackingEvent
      const newEvent = await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: targetStatus,
          location,
          description,
          eventTime,
          providerEvent: rawStatus,
          rawPayload: body,
        },
      });

      // Update Shipment status and timestamps
      const shipmentDataToUpdate: any = {
        status: targetStatus,
      };
      if (targetStatus === 'PICKED_UP' && !shipment.pickedUpAt) {
        shipmentDataToUpdate.pickedUpAt = eventTime;
      } else if (targetStatus === 'DELIVERED' && !shipment.deliveredAt) {
        shipmentDataToUpdate.deliveredAt = eventTime;
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: shipmentDataToUpdate,
      });

      // Sync SubOrder status
      let subOrderStatus = shipment.fulfillment.status;
      if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(targetStatus)) {
        subOrderStatus = 'SHIPPED';
      } else if (targetStatus === 'DELIVERED') {
        subOrderStatus = 'DELIVERED';
      } else if (targetStatus === 'CANCELLED') {
        subOrderStatus = 'CANCELLED';
      }

      await tx.subOrder.update({
        where: { id: shipment.fulfillmentId },
        data: {
          status: subOrderStatus,
        },
      });

      // Fetch all sub-orders of parent Order to derive aggregate status
      const allSubOrders = await tx.subOrder.findMany({
        where: { orderId: shipment.fulfillment.orderId },
        select: { status: true },
      });

      const aggregateStatus = deriveAggregateOrderStatus(allSubOrders.map((s) => s.status));

      const parentOrder = shipment.fulfillment.order;
      let newPaymentStatus = parentOrder.paymentStatus;
      let codCollectedAmount = parentOrder.codCollectedAmount;

      if (targetStatus === 'DELIVERED' && parentOrder.paymentMethod === 'COD') {
        const cashCollected = body.cashCollected ?? body.cash_collected ?? true;
        const amountCollected = parseFloat(body.amountCollected || body.amount_collected || parentOrder.totalAmount);

        if (cashCollected && amountCollected >= (parentOrder.totalAmount - 0.01)) {
          newPaymentStatus = 'COD_COLLECTED';
          codCollectedAmount = amountCollected;
        }
      }

      await tx.order.update({
        where: { id: shipment.fulfillment.orderId },
        data: {
          aggregateStatus,
          paymentStatus: newPaymentStatus,
          codCollectedAmount,
        },
      });

      return { updatedShipment, newEvent, aggregateStatus };
    });

    return ApiResponse.success(
      {
        shipmentId: result.updatedShipment.id,
        awbNumber: result.updatedShipment.awbNumber,
        newStatus: result.updatedShipment.status,
        aggregateOrderStatus: result.aggregateStatus,
      },
      'Delivery webhook processed successfully'
    );
  } catch (err: any) {
    console.error('Error processing delivery webhook:', err);
    return ApiResponse.serverError('Failed to process delivery webhook', err.message);
  }
}
