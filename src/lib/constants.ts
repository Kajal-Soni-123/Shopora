// Centralized system constants

export const SHIPPING_CARRIERS = [
  'FedEx Express',
  'DHL Logistics',
  'UPS Ground',
  'Nordic Air Cargo',
  'BlueDart Logistics',
] as const;

export type ShippingCarrier = typeof SHIPPING_CARRIERS[number];

export const ORDER_STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    description: 'Order placed, awaiting payment validation',
  },
  PROCESSING: {
    label: 'Processing',
    variant: 'info',
    description: 'Order confirmed and being packed at vendor warehouse',
  },
  SHIPPED: {
    label: 'Shipped',
    variant: 'primary',
    description: 'Order handed to courier and in transit',
  },
  DELIVERED: {
    label: 'Delivered',
    variant: 'success',
    description: 'Order delivered to shipping address',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'danger',
    description: 'Order cancelled',
  },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUS_CONFIG;

export const PAYMENT_METHODS = [
  { id: 'CREDIT_CARD', name: 'Credit / Debit Card', icon: '💳' },
  { id: 'APPLE_PAY', name: 'Apple Pay', icon: '🍎' },
  { id: 'PAYPAL', name: 'PayPal', icon: '🅿️' },
  { id: 'CO_SHOP_SPLIT', name: 'Co-Shop Shared Checkout', icon: '👥' },
] as const;

export const DEFAULT_VENDOR_FALLBACK = {
  id: 'vendor_urban_tech',
  name: 'Fulfillment Partner',
  email: 'support@vendor.com',
  warehouseLocation: 'Central Whse #101',
  rating: 4.8,
};
