export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { mapProviderStatusToInternal } from '@/lib/shipping/statusMapper';
import { applyShipmentEvent } from '@/lib/shipping/applyShipmentUpdate';

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    // Only the courier may call this: it can mark orders shipped/delivered.
    // Configure the same secret in the courier dashboard (header or ?secret= query param).
    const expectedSecret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = req.headers.get('x-webhook-secret') || req.nextUrl.searchParams.get('secret');
      if (provided !== expectedSecret) return ApiResponse.unauthorized('Invalid webhook secret');
    } else if (process.env.NODE_ENV === 'production') {
      console.error('SHIPPING_WEBHOOK_SECRET is not set — rejecting shipping webhook');
      return ApiResponse.serverError('Shipping webhook is not configured');
    }

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

    // 4. Record the event and sync shipment, sub-order and order (shared with simulator / self-delivery)
    const cashCollected = body.cashCollected ?? body.cash_collected;
    const amountCollected = body.amountCollected ?? body.amount_collected;
    const result = await applyShipmentEvent({
      shipmentId: shipment.id,
      status: targetStatus,
      location,
      description,
      eventTime,
      providerEvent: rawStatus,
      rawPayload: body,
      cashCollected: cashCollected === undefined ? undefined : Boolean(cashCollected),
      amountCollected: amountCollected === undefined ? undefined : parseFloat(amountCollected),
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
