import { ShipmentStatus } from '@/lib/shipping/types';

/**
 * Dev courier simulator — plays the courier's part for the 'mock' provider, which has no
 * real courier sending tracking webhooks. On in development; in production only when
 * NEXT_PUBLIC_ENABLE_COURIER_SIMULATOR=true (e.g. a staging/demo deploy).
 */
export const COURIER_SIMULATOR_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_COURIER_SIMULATOR === 'true';

/** The courier's happy path after pickup is scheduled */
export const COURIER_STEPS: ShipmentStatus[] = ['PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const STEP_DETAILS: Partial<Record<ShipmentStatus, { label: string; description: string; location: string }>> = {
  PICKED_UP: { label: 'Picked up', description: 'Package picked up by courier executive', location: 'Seller warehouse' },
  IN_TRANSIT: { label: 'In transit', description: 'Shipment in transit to the destination city', location: 'Regional sortation hub' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', description: 'Out for delivery with the courier executive', location: 'Destination delivery hub' },
  DELIVERED: { label: 'Delivered', description: 'Delivered to the customer', location: 'Customer address' },
};

export function nextCourierStep(current: string): ShipmentStatus | null {
  const i = COURIER_STEPS.indexOf(current as ShipmentStatus);
  return i >= 0 && i < COURIER_STEPS.length - 1 ? COURIER_STEPS[i + 1] : null;
}
