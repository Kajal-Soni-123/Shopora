import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDeliveryProvider } from '@/lib/shipping/ProviderFactory';

export async function POST(
  req: NextRequest,
  { params }: { params: { shipmentId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return ApiResponse.unauthorized('Authentication required to schedule pickup');
    }

    const { shipmentId } = params;
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        fulfillment: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!shipment) {
      return ApiResponse.notFound('Shipment not found');
    }

    if (user.role === 'VENDOR' && user.vendorId !== shipment.fulfillment.vendorId) {
      return ApiResponse.forbidden('Access denied: You cannot schedule pickup for another vendor shipment');
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    const pickupAddress = {
      name: shipment.fulfillment.vendor.name,
      email: shipment.fulfillment.vendor.email,
      address: shipment.fulfillment.vendor.warehouseLocation || 'Central Vendor Hub',
      pincode: '110001',
    };

    const provider = getDeliveryProvider(shipment.provider);
    const pickupResult = await provider.schedulePickup({
      shipmentId: shipment.id,
      providerShipmentId: shipment.providerShipmentId || shipment.id,
      awbNumber: shipment.awbNumber || 'AWB-UNKNOWN',
      pickupDate: body.pickupDate,
      pickupAddress,
    });

    const scheduledDate = new Date(pickupResult.pickupScheduledAt);

    // Update Shipment status and pickupScheduledAt in DB transaction
    const updatedShipment = await prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'PICKUP_SCHEDULED',
          pickupScheduledAt: scheduledDate,
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: 'PICKUP_SCHEDULED',
          location: pickupAddress.address,
          description: `Courier pickup scheduled for ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString()}`,
          eventTime: new Date(),
          providerEvent: 'PICKUP_SCHEDULED',
        },
      });

      // Update SubOrder status to READY_FOR_PICKUP
      await tx.subOrder.update({
        where: { id: shipment.fulfillmentId },
        data: {
          status: 'READY_FOR_PICKUP',
        },
      });

      return updated;
    });

    return ApiResponse.success(
      {
        shipmentId: updatedShipment.id,
        status: updatedShipment.status,
        pickupScheduledAt: updatedShipment.pickupScheduledAt,
      },
      'Courier pickup scheduled successfully'
    );
  } catch (err: any) {
    console.error('Error scheduling pickup:', err);
    return ApiResponse.serverError('Failed to schedule pickup', err.message);
  }
}
