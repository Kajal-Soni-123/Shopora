import { ShipmentStatus } from './types';

/**
 * Maps external provider status strings (e.g. Shiprocket, Delhivery, Mock)
 * to standardized internal ShipmentStatus enum values.
 */
export function mapProviderStatusToInternal(
  provider: string,
  rawStatus: string
): ShipmentStatus {
  const normalized = (rawStatus || '').trim().toUpperCase();

  switch (provider.toLowerCase()) {
    case 'shiprocket':
      if (normalized.includes('LABEL') || normalized.includes('MANIFEST')) return 'LABEL_GENERATED';
      if (normalized.includes('PICKUP SCHEDULED') || normalized.includes('PICKUP GENERATED')) return 'PICKUP_SCHEDULED';
      if (normalized.includes('PICKED UP') || normalized.includes('OUT FOR PICKUP')) return 'PICKED_UP';
      if (normalized.includes('IN TRANSIT') || normalized.includes('REACHED HUB')) return 'IN_TRANSIT';
      if (normalized.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
      if (normalized.includes('DELIVERED')) return 'DELIVERED';
      if (normalized.includes('UNDELIVERED') || normalized.includes('FAILED')) return 'DELIVERY_FAILED';
      if (normalized.includes('CANCELED') || normalized.includes('CANCELLED')) return 'CANCELLED';
      if (normalized.includes('RTO') || normalized.includes('RETURN')) return 'RETURN_IN_TRANSIT';
      break;

    case 'delhivery':
      if (normalized === 'MANIFESTED') return 'LABEL_GENERATED';
      if (normalized === 'DISPATCHED' || normalized === 'IN TRANSIT') return 'IN_TRANSIT';
      if (normalized === 'OUT FOR DELIVERY') return 'OUT_FOR_DELIVERY';
      if (normalized === 'DELIVERED') return 'DELIVERED';
      if (normalized === 'CANCELLED') return 'CANCELLED';
      if (normalized === 'RTO' || normalized === 'RETURN') return 'RETURN_IN_TRANSIT';
      break;

    case 'mock':
    default:
      const validStatuses: ShipmentStatus[] = [
        'CREATED',
        'LABEL_GENERATED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'DELIVERY_FAILED',
        'CANCELLED',
        'RETURN_REQUESTED',
        'RETURN_IN_TRANSIT',
        'RETURNED',
      ];
      if (validStatuses.includes(normalized as ShipmentStatus)) {
        return normalized as ShipmentStatus;
      }
      break;
  }

  return 'IN_TRANSIT';
}
