export interface Vendor {
  id: string;
  name: string;
  email: string;
  warehouseLocation: string;
  rating: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images?: string[];
  attributes?: Record<string, any>;
  rating: number;
  reviewsCount: number;
  vendorId: string;
  categoryId: string;
  vendor?: Vendor;
  category?: Category;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TrackingEvent {
  status: string;
  label: string;
  timestamp: string;
  note: string;
  completed: boolean;
}

export interface SubOrder {
  id: string;
  subOrderNumber: string;
  vendorId: string;
  vendor: Vendor;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  trackingNumber: string;
  shippingCarrier: string;
  expectedDelivery: string;
  deliveredAt?: string;
  statusHistory: TrackingEvent[];
  items: {
    product: Product;
    quantity: number;
    price: number;
  }[];
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  transactionId?: string;
  paymentDetails?: {
    method: string;
    maskedDetails: string;
    provider?: string;
  };
  totalAmount: number;
  aggregateStatus: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  subOrders: SubOrder[];
  createdAt: string;
}

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vendor_urban_tech',
    name: 'UrbanTech Gear Studio',
    email: 'fulfillment@urbantech.com',
    warehouseLocation: 'Seattle, WA (Whse #101)',
    rating: 4.9,
  },
  {
    id: 'vendor_nordic_wear',
    name: 'Nordic Apparel Co.',
    email: 'shipping@nordicapparel.io',
    warehouseLocation: 'Portland, OR (Whse #402)',
    rating: 4.8,
  },
  {
    id: 'vendor_luxe_audio',
    name: 'Luxe Acoustic Labs',
    email: 'logistics@luxeacoustics.com',
    warehouseLocation: 'Austin, TX (Whse #205)',
    rating: 4.95,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_outerwear', name: 'Outerwear', slug: 'outerwear' },
  { id: 'cat_audio', name: 'Audio', slug: 'audio' },
  { id: 'cat_bags', name: 'Bags & Packs', slug: 'bags' },
  { id: 'cat_footwear', name: 'Footwear', slug: 'footwear' },
  { id: 'cat_accessories', name: 'Accessories', slug: 'accessories' },
];

export const INITIAL_PRODUCTS: Product[] = [];

