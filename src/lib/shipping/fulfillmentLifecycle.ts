import { FulfillmentStatus, ShipmentStatus } from './types';

/**
 * Valid allowed fulfillment state transitions
 */
const VALID_FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  PARTIALLY_CANCELLED: [],
  CANCELLED: [],
};

/**
 * Check if a fulfillment status transition is valid
 */
export function isValidFulfillmentTransition(
  currentStatus: FulfillmentStatus,
  targetStatus: FulfillmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_FULFILLMENT_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Valid allowed shipment status transitions
 */
const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ['LABEL_GENERATED', 'CANCELLED'],
  LABEL_GENERATED: ['PICKUP_SCHEDULED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERY_FAILED', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'RETURN_REQUESTED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'],
  DELIVERY_FAILED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RETURN_REQUESTED', 'CANCELLED'],
  CANCELLED: [],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_PICKUP_SCHEDULED', 'RETURN_IN_TRANSIT', 'CANCELLED'],
  RETURN_PICKUP_SCHEDULED: ['RETURN_PICKED_UP', 'CANCELLED'],
  RETURN_PICKED_UP: ['RETURN_IN_TRANSIT', 'CANCELLED'],
  RETURN_IN_TRANSIT: ['RETURNED'],
  RETURNED: [],
};

/**
 * Check if a shipment status transition is valid
 */
export function isValidShipmentTransition(
  currentStatus: ShipmentStatus,
  targetStatus: ShipmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_SHIPMENT_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Derive overall aggregate Order status based on all vendor sub-orders / fulfillments
 */
export function deriveAggregateOrderStatus(subOrderStatuses: string[]): string {
  if (!subOrderStatuses.length) return 'PROCESSING';

  const normalized = subOrderStatuses.map((s) => s.toUpperCase());

  if (normalized.every((s) => s === 'DELIVERED' || s === 'COMPLETED')) {
    return 'DELIVERED';
  }

  if (normalized.every((s) => s === 'CANCELLED')) {
    return 'CANCELLED';
  }

  if (
    normalized.some((s) =>
      ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'COMPLETED', 'DELIVERED'].includes(s)
    )
  ) {
    return 'SHIPPED';
  }

  if (
    normalized.some((s) =>
      ['PROCESSING', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP'].includes(s)
    )
  ) {
    return 'PROCESSING';
  }

  return 'PENDING';
}
