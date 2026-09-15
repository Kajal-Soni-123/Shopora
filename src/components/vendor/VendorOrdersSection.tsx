'use client';

import React from 'react';
import { SubOrderCard } from '@/components/vendor/SubOrderCard';
import { Truck, Loader2 } from 'lucide-react';

export interface VendorSubOrder {
  id: string;
  subOrderNumber: string;
  status: string;
  subtotal: number;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    shippingAddress: string;
    paymentStatus: string;
  };
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      title: string;
      image: string;
    };
  }[];
}

interface VendorOrdersSectionProps {
  subOrders: VendorSubOrder[];
  loadingData: boolean;
  onUpdateFulfillment: (subOrderId: string, tracking: string, carrier: string) => Promise<void>;
  fulfillingId: string | null;
}

export const VendorOrdersSection: React.FC<VendorOrdersSectionProps> = ({
  subOrders,
  loadingData,
  onUpdateFulfillment,
  fulfillingId,
}) => {
  if (loadingData) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs font-semibold">Loading assigned sub-orders...</p>
      </div>
    );
  }

  if (subOrders.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
        <Truck className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">No sub-orders assigned yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
          When customers purchase your items, sub-orders dispatched from your warehouse will appear here for fulfillment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subOrders.map((so) => (
        <SubOrderCard
          key={so.id}
          subOrder={so}
          onUpdateFulfillment={onUpdateFulfillment}
          isFulfilling={fulfillingId === so.id}
        />
      ))}
    </div>
  );
};
