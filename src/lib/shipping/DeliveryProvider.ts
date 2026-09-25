import {
  ServiceabilityInput,
  ServiceabilityResult,
  CreateShipmentInput,
  ShipmentResult,
  LabelResult,
  PickupInput,
  PickupResult,
  TrackingResult,
  CodAvailabilityInput,
  CodAvailabilityResult,
  ReverseShipmentInput,
  ReverseShipmentResult,
} from './types';

export interface DeliveryProvider {
  name: string;

  checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityResult>;

  checkCodAvailability(input: CodAvailabilityInput): Promise<CodAvailabilityResult>;

  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;

  generateLabel(shipmentId: string, awbNumber: string): Promise<LabelResult>;

  schedulePickup(input: PickupInput): Promise<PickupResult>;

  getTracking(shipmentId: string, awbNumber: string): Promise<TrackingResult>;

  cancelShipment(shipmentId: string, awbNumber: string): Promise<void>;

  createReverseShipment(input: ReverseShipmentInput): Promise<ReverseShipmentResult>;
}
