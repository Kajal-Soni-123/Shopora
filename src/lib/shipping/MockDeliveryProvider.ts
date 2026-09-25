import { DeliveryProvider } from './DeliveryProvider';
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

export class MockDeliveryProvider implements DeliveryProvider {
  name = 'mock';

  async checkServiceability(input: ServiceabilityInput): Promise<ServiceabilityResult> {
    const isServiceable = input.deliveryPincode.length >= 5 && input.deliveryPincode !== '000000';
    return {
      serviceable: isServiceable,
      codAvailable: isServiceable && input.deliveryPincode !== '999999',
      prepaidAvailable: isServiceable,
      estimatedDays: isServiceable ? 3 : 0,
      courierName: 'Shopora Express Logistics (Mock)',
      shippingCharge: isServiceable ? 49.00 : 0,
    };
  }

  async checkCodAvailability(input: CodAvailabilityInput): Promise<CodAvailabilityResult> {
    const MAX_COD_LIMIT = 50000; // ₹50,000 max order limit for COD
    const pincode = input.pincode ? input.pincode.trim() : '';

    if (!pincode || pincode.length < 5 || pincode === '000000' || pincode === '999999') {
      return {
        allowed: false,
        reason: 'Cash on Delivery is not serviceable at pincode ' + (pincode || 'provided'),
        maxAmountLimit: MAX_COD_LIMIT,
      };
    }

    if (input.orderAmount > MAX_COD_LIMIT) {
      return {
        allowed: false,
        reason: `Order total (${input.orderAmount}) exceeds maximum COD limit of ₹${MAX_COD_LIMIT.toLocaleString('en-IN')}`,
        maxAmountLimit: MAX_COD_LIMIT,
      };
    }

    return {
      allowed: true,
      maxAmountLimit: MAX_COD_LIMIT,
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const randomSeed = Math.floor(100000 + Math.random() * 900000);
    const providerOrderId = `MOCK-ORD-${input.orderNumber}-${randomSeed}`;
    const providerShipmentId = `MOCK-SHP-${randomSeed}`;
    const awbNumber = `AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const trackingUrl = `/orders?awb=${encodeURIComponent(awbNumber)}`;

    return {
      provider: 'mock',
      providerOrderId,
      providerShipmentId,
      awbNumber,
      trackingUrl,
      status: 'CREATED',
      weight: input.dimensions?.weight || 0.5,
      length: input.dimensions?.length || 10.0,
      breadth: input.dimensions?.breadth || 10.0,
      height: input.dimensions?.height || 10.0,
    };
  }

  async generateLabel(shipmentId: string, awbNumber: string): Promise<LabelResult> {
    const labelUrl = `/api/shipments/${shipmentId}/label?raw=true&awb=${encodeURIComponent(awbNumber)}`;
    return {
      shipmentId,
      awbNumber,
      labelUrl,
    };
  }

  async schedulePickup(input: PickupInput): Promise<PickupResult> {
    const pickupDate = input.pickupDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
      shipmentId: input.shipmentId,
      pickupScheduledAt: pickupDate,
      status: 'PICKUP_SCHEDULED',
    };
  }

  async getTracking(shipmentId: string, awbNumber: string): Promise<TrackingResult> {
    const now = new Date();
    return {
      shipmentId,
      awbNumber,
      status: 'IN_TRANSIT',
      estimatedDeliveryDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          status: 'CREATED',
          description: 'Shipment manifest created in system',
          location: 'Merchant Warehouse',
          eventTime: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
          providerEvent: 'ORDER_MANIFESTED',
        },
        {
          status: 'PICKED_UP',
          description: 'Package picked up by courier executive',
          location: 'Origin Facility Hub',
          eventTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          providerEvent: 'PICKUP_DONE',
        },
        {
          status: 'IN_TRANSIT',
          description: 'Shipment in transit to regional sortation center',
          location: 'Central Gateway Logistics Park',
          eventTime: now.toISOString(),
          providerEvent: 'IN_TRANSIT_HUB',
        },
      ],
    };
  }

  async cancelShipment(shipmentId: string, awbNumber: string): Promise<void> {
    return;
  }

  async createReverseShipment(input: ReverseShipmentInput): Promise<ReverseShipmentResult> {
    const randomAwb = `REV-AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      provider: 'mock',
      reverseAwb: randomAwb,
      status: 'RETURN_PICKUP_SCHEDULED',
      scheduledPickupDate: scheduledDate,
    };
  }
}
