import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  try {
    const { shipmentId } = params;

    // Search by shipment ID or AWB number
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { id: shipmentId },
          { awbNumber: shipmentId },
          { providerShipmentId: shipmentId },
        ],
      },
      include: {
        fulfillment: {
          include: {
            vendor: true,
            order: true,
          },
        },
        trackingEvents: {
          orderBy: {
            eventTime: 'asc',
          },
        },
      },
    });

    if (!shipment) {
      return ApiResponse.notFound('Shipment not found');
    }

    const events = shipment.trackingEvents.map((evt) => ({
      id: evt.id,
      status: evt.status,
      location: evt.location,
      description: evt.description,
      eventTime: evt.eventTime,
      providerEvent: evt.providerEvent,
    }));

    return ApiResponse.success(
      {
        shipment: {
          id: shipment.id,
          fulfillmentId: shipment.fulfillmentId,
          provider: shipment.provider,
          awbNumber: shipment.awbNumber,
          trackingUrl: shipment.trackingUrl,
          status: shipment.status,
          labelUrl: shipment.labelUrl,
          pickupScheduledAt: shipment.pickupScheduledAt,
          pickedUpAt: shipment.pickedUpAt,
          deliveredAt: shipment.deliveredAt,
          vendorName: shipment.fulfillment.vendor.name,
          customerName: shipment.fulfillment.order.customerName,
          shippingAddress: shipment.fulfillment.order.shippingAddress,
          subOrderNumber: shipment.fulfillment.subOrderNumber,
        },
        events,
      },
      'Shipment tracking events fetched successfully'
    );
  } catch (err: any) {
    console.error('Error fetching tracking events:', err);
    return ApiResponse.serverError('Failed to fetch shipment tracking details', err.message);
  }
}
