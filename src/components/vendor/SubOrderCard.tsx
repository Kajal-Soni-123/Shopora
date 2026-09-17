'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Truck,
  Clock,
  CheckCircle2,
  PackageCheck,
  Package,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getColorStyle } from '@/lib/color-utils';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';

export interface VendorSubOrderData {
  id: string;
  subOrderNumber: string;
  status: string;
  subtotal: number;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  createdAt: string;
  expectedDelivery?: string;
  deliveredAt?: string;
  statusHistory?: {
    status: string;
    label: string;
    timestamp: string;
    note: string;
    completed: boolean;
  }[];
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
      description?: string;
      attributes?: Record<string, any>;
    };
  }[];
}

interface SubOrderCardProps {
  subOrder: VendorSubOrderData;
  onUpdateStatus: (
    subOrderId: string,
    status: string,
    trackingNumber: string,
    shippingCarrier: string,
    note?: string
  ) => Promise<void>;
  isUpdating: boolean;
}

const statusOptions = [
  { value: 'PENDING', label: 'Order Placed (Pending)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'CONFIRMED', label: 'Order Confirmed', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'PACKED', label: 'Packed & Ready', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'SHIPPED', label: 'Shipped (In Transit)', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const SubOrderCard: React.FC<SubOrderCardProps> = ({
  subOrder,
  onUpdateStatus,
  isUpdating,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(subOrder.status || 'PENDING');
  const [carrier, setCarrier] = useState(subOrder.shippingCarrier || 'FedEx Express');
  const [tracking, setTracking] = useState(subOrder.trackingNumber || '');
  const [note, setNote] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  const currentStatusConfig =
    statusOptions.find((s) => s.value === subOrder.status) || statusOptions[0];

  const handleStatusUpdate = async () => {
    if (
      (selectedStatus === 'SHIPPED' || selectedStatus === 'OUT_FOR_DELIVERY') &&
      !tracking.trim()
    ) {
      alert('Please enter a tracking number before updating status to Shipped or Out for Delivery.');
      return;
    }
    await onUpdateStatus(
      subOrder.id,
      selectedStatus,
      tracking.trim(),
      carrier.trim() || 'Standard Courier',
      note.trim()
    );
    setNote('');
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5 transition-all hover:border-indigo-200">
      {/* Sub-Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              Sub-Order
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{subOrder.subOrderNumber}</h3>
            <span className="text-xs font-bold text-slate-400">
              (Master #{subOrder.order.orderNumber})
            </span>
          </div>

          <div className="text-xs text-slate-600 font-medium space-y-0.5">
            <p>
              Customer: <strong className="text-slate-900">{subOrder.order.customerName}</strong> ({subOrder.order.customerEmail})
            </p>
            <p className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{subOrder.order.shippingAddress}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${currentStatusConfig.color}`}
          >
            {subOrder.status === 'DELIVERED' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : subOrder.status === 'CANCELLED' ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : subOrder.status === 'SHIPPED' || subOrder.status === 'OUT_FOR_DELIVERY' ? (
              <Truck className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {currentStatusConfig.label}
          </span>

          <span className="text-xs font-extrabold text-slate-900">
            Subtotal: {formatCurrency(subOrder.subtotal)}
          </span>
        </div>
      </div>

      {/* Package Contents / Items */}
      <div className="space-y-3">
        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
          Package Contents ({subOrder.items.length} item{subOrder.items.length > 1 ? 's' : ''})
        </span>

        <div className="space-y-2">
          {subOrder.items.map((item) => {
            const product = item.product;
            const attributes = product?.attributes || {};
            const attributeEntries = Object.entries(attributes);

            return (
              <div
                key={item.id}
                className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <Image
                      src={product.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                      alt={product.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{product.title}</h4>
                    {attributeEntries.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {attributeEntries.map(([k, v]) => {
                          const displayV = Array.isArray(v) ? v.join(', ') : String(v);
                          const isColor = k.toLowerCase().includes('color');
                          const colorStyle = isColor ? getColorStyle(displayV) : null;
                          return (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
                            >
                              {colorStyle && (
                                <span
                                  className={`w-2 h-2 rounded-full border ${colorStyle.border}`}
                                  style={{ background: colorStyle.background }}
                                />
                              )}
                              <span className="text-slate-400">{k}:</span>
                              <span className="text-slate-900">{displayV}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs font-bold text-slate-800">
                  <span>{item.quantity} × {formatCurrency(item.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vendor Status & Dispatch Control Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            Update Sub-Order Status & Tracking
          </span>

          {subOrder.statusHistory && subOrder.statusHistory.length > 0 && (
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>{showTimeline ? 'Hide History' : 'View Timeline History'}</span>
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status Dropdown Selector */}
          <Select
            label="Select Status"
            options={statusOptions}
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
          />

          {/* Carrier Input */}
          <Input
            label="Courier Carrier"
            placeholder="e.g. FedEx, BlueDart, Delhivery"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />

          {/* Tracking ID Input */}
          <Input
            label="Tracking Number"
            placeholder="e.g. TRK-NORDIC-98214"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </div>

        {/* Optional Status Update Note / Dispatch Comment */}
        <Input
          label="Update Note / Dispatch Comment (Optional)"
          placeholder="e.g. Package packed at main facility and handed over to courier driver."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Action Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Updating Status...
              </>
            ) : (
              <>
                <PackageCheck className="w-3.5 h-3.5" />
                Update Order Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Status History Timeline */}
      {showTimeline && subOrder.statusHistory && subOrder.statusHistory.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
            Status Event History Log
          </span>
          <div className="divide-y divide-slate-200/60">
            {subOrder.statusHistory.map((evt, idx) => (
              <div key={idx} className="py-2 flex items-start justify-between text-xs gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    {evt.label}
                  </span>
                  {evt.note && <p className="text-[11px] text-slate-600 font-medium pl-3.5">{evt.note}</p>}
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {new Date(evt.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
