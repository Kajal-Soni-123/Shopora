export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { applyShipmentEvent, nextEventTimes, stripDeliveryOtp } from '@/lib/shipping/applyShipmentUpdate';
import { COURIER_SIMULATOR_ENABLED, STEP_DETAILS, nextCourierStep } from '@/lib/shipping/simulator';
import { ShipmentStatus } from '@/lib/shipping/types';

// POST /api/shipments/[shipmentId]/simulate — dev courier: advance a mock shipment
// one step (mode: 'NEXT') or all the way to delivered (mode: 'DELIVER').
export async function POST(req: NextRequest, { params }: { params: { shipmentId: string } }) {
  try {
    if (!COURIER_SIMULATOR_ENABLED) return ApiResponse.forbidden('The courier simulator is disabled.');

    const user = await getSessionUser();
    if (!user) return ApiResponse.unauthorized('Please log in.');

    const { mode = 'NEXT' } = await req.json().catch(() => ({}));
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.shipmentId },
      include: { fulfillment: { select: { vendorId: true } } },
    });
    if (!shipment) return ApiResponse.notFound('Shipment not found');

    const isOwner = user.role === 'VENDOR' && user.vendorId === shipment.fulfillment.vendorId;
    if (!isOwner && user.role !== 'ADMIN') return ApiResponse.forbidden('Not your shipment.');
    if (shipment.provider !== 'mock') {
      return ApiResponse.badRequest('Only mock-courier shipments can be simulated — real couriers update tracking themselves.');
    }

    let current = shipment.status;
    if (!nextCourierStep(current)) {
      return ApiResponse.badRequest(
        current === 'DELIVERED'
          ? 'This shipment is already delivered.'
          : 'Schedule the courier pickup first — the simulator starts from a scheduled pickup.'
      );
    }

    // Apply one step, or every remaining step a few seconds apart so the timeline reads in order
    const steps: ShipmentStatus[] = [];
    for (let next = nextCourierStep(current); next; next = mode === 'DELIVER' ? nextCourierStep(next) : null) {
      steps.push(next);
    }
    const times = await nextEventTimes(shipment.id, steps.length);
    for (let i = 0; i < steps.length; i++) {
      const status = steps[i];
      const details = STEP_DETAILS[status]!;
      await applyShipmentEvent({
        shipmentId: shipment.id,
        status,
        description: details.description,
        location: details.location,
        eventTime: times[i],
        providerEvent: `SIMULATED_${status}`,
        rawPayload: { simulated: true, by: user.userId },
      });
      current = status;
    }

    const updated = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: { trackingEvents: { orderBy: { eventTime: 'asc' } } },
    });
    return ApiResponse.success(stripDeliveryOtp(updated), `Courier update: ${STEP_DETAILS[current as ShipmentStatus]?.label}`);
  } catch (error: any) {
    console.error('Courier simulator error:', error);
    return ApiResponse.serverError('Failed to simulate courier update', error?.message);
  }
}
