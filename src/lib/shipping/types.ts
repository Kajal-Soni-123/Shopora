/**
 * Multi-Vendor Fulfillment & Delivery System Types
 */

export type FulfillmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PARTIALLY_CANCELLED'
  | 'CANCELLED';

export type ShipmentStatus =
  | 'CREATED'
  | 'LABEL_GENERATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_PICKUP_SCHEDULED'
  | 'RETURN_PICKED_UP'
  | 'RETURN_IN_TRANSIT'
  | 'RETURNED';

export interface ServiceabilityInput {
  pickupPincode: string;
  deliveryPincode: string;
  weight?: number; // in KG
  cod?: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  estimatedDays: number;
  courierName: string;
  shippingCharge: number;
}

export interface ShippingAddressInfo {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  pincode: string;
}

export interface PackageDimensions {
  weight: number; // in KG
  length: number; // in cm
  breadth: number; // in cm
  height: number; // in cm
}

export interface CreateShipmentInput {
  fulfillmentId: string;
  orderNumber: string;
  subOrderNumber: string;
  vendorId: string;
  pickupAddress: ShippingAddressInfo;
  deliveryAddress: ShippingAddressInfo;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  dimensions?: PackageDimensions;
  paymentMethod?: string; // COD or CREDIT_CARD
  totalAmount: number;
}

export interface ShipmentResult {
  provider: string;
  providerOrderId: string;
  providerShipmentId: string;
  awbNumber: string;
  trackingUrl: string;
  status: ShipmentStatus;
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

export interface LabelResult {
  shipmentId: string;
  awbNumber: string;
  labelUrl: string;
}

export interface PickupInput {
  shipmentId: string;
  providerShipmentId: string;
  awbNumber: string;
  pickupDate?: string;
  pickupAddress: ShippingAddressInfo;
}

export interface PickupResult {
  shipmentId: string;
  pickupScheduledAt: string;
  status: ShipmentStatus;
}

export interface TrackingEventData {
  status: ShipmentStatus;
  location?: string;
  description: string;
  eventTime: string;
  providerEvent?: string;
  rawPayload?: Record<string, unknown>;
}

export interface TrackingResult {
  shipmentId: string;
  awbNumber: string;
  status: ShipmentStatus;
  events: TrackingEventData[];
  estimatedDeliveryDate?: string;
}

export interface CodAvailabilityInput {
  pincode: string;
  vendorIds?: string[];
  orderAmount: number;
}

export interface CodAvailabilityResult {
  allowed: boolean;
  reason?: string;
  maxAmountLimit: number;
}

export interface ReverseShipmentInput {
  returnRequestId: string;
  orderNumber: string;
  subOrderNumber: string;
  customerAddress: ShippingAddressInfo;
  vendorAddress: ShippingAddressInfo;
  items: {
    name: string;
    quantity: number;
  }[];
}

export interface ReverseShipmentResult {
  provider: string;
  reverseAwb: string;
  status: ShipmentStatus;
  scheduledPickupDate: string;
}
