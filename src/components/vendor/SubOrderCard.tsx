'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Truck, Clock, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface VendorSubOrderData {
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

interface SubOrderCardProps {
  subOrder: VendorSubOrderData;
  onUpdateFulfillment: (subOrderId: string, tracking: string, carrier: string) => Promise<void>;
  isFulfilling: boolean;
}

export const SubOrderCard: React.FC<SubOrderCardProps> = ({
  subOrder,
  onUpdateFulfillment,
  isFulfilling,
}) => {
  const isShipped = subOrder.status === 'SHIPPED';
  const [carrier, setCarrier] = useState(subOrder.shippingCarrier || 'FedEx Express');
  const [tracking, setTracking] = useState(subOrder.trackingNumber || '');

  const handleShip = async () => {
    if (!tracking.trim()) {
      alert('Please enter a tracking number before marking as shipped.');
      return;
    }
    await onUpdateFulfillment(subOrder.id, tracking.trim(), carrier.trim() || 'FedEx Express');
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              Sub-Order
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{subOrder.subOrderNumber}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Master Order #{subOrder.order.orderNumber} • Customer:{' '}
            <span className="font-bold text-slate-800">{subOrder.order.customerName}</span> ({subOrder.order.customerEmail})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isShipped ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isShipped ? <Truck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {subOrder.status}
          </span>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700">Package Contents ({subOrder.items.length})</span>
        <div className="space-y-1.5">
          {subOrder.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  <Image src={item.product.image} alt={item.product.title} fill sizes="40px" className="object-cover" />
                </div>
                <span className="text-xs font-bold text-slate-900">{item.product.title}</span>
              </div>
              <span className="text-xs font-bold text-slate-700">
                Qty: {item.quantity} × {formatCurrency(item.price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fulfillment Controls */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto flex-1">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Carrier</label>
            <input
              type="text"
              disabled={isShipped}
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. FedEx Express"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Tracking Number</label>
            <input
              type="text"
              disabled={isShipped}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. TRK-NORDIC-94821"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 disabled:bg-slate-100"
            />
          </div>
        </div>

        {!isShipped ? (
          <button
            onClick={handleShip}
            disabled={isFulfilling}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 whitespace-nowrap transition-all"
          >
            {isFulfilling ? 'Updating...' : 'Mark as Shipped'}
          </button>
        ) : (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Shipped & Dispatched
          </span>
        )}
      </div>
    </div>
  );
};
