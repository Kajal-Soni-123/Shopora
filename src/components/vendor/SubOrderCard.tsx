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
  FileText,
  CalendarDays,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getColorStyle } from '@/lib/color-utils';

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
  shipments?: {
    id: string;
    provider: string;
    providerOrderId?: string | null;
    providerShipmentId?: string | null;
    awbNumber?: string | null;
    trackingUrl?: string | null;
    status: string;
    labelUrl?: string | null;
    pickupScheduledAt?: string | null;
    pickedUpAt?: string | null;
    deliveredAt?: string | null;
    trackingEvents?: {
      id: string;
      status: string;
      location?: string | null;
      description: string;
      eventTime: string;
      providerEvent?: string | null;
    }[];
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
  { value: 'PENDING', label: 'Pending Confirmation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'CONFIRMED', label: 'Order Confirmed', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'PROCESSING', label: 'Processing Order', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'PACKED', label: 'Packed & Ready', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Courier Pickup', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'SHIPPED', label: 'Shipped / In Transit', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'DELIVERED', label: 'Delivered to Customer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const SubOrderCard: React.FC<SubOrderCardProps> = ({
  subOrder,
  onUpdateStatus,
  isUpdating,
}) => {
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isSchedulingPickup, setIsSchedulingPickup] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [localShipments, setLocalShipments] = useState(subOrder.shipments || []);

  const activeShipment = localShipments.find((s) => s.status !== 'CANCELLED');
  const currentStatusConfig =
    statusOptions.find((s) => s.value === subOrder.status) || statusOptions[0];

  const handleNextFulfillmentStep = async (nextStatus: string) => {
    await onUpdateStatus(subOrder.id, nextStatus, subOrder.trackingNumber || '', subOrder.shippingCarrier || 'Mock Express');
  };

  const handleCreateShipment = async () => {
    try {
      setIsCreatingShipment(true);
      const res = await fetch(`/api/fulfillments/${subOrder.id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: 0.5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalShipments([data.data, ...localShipments]);
        await onUpdateStatus(subOrder.id, 'READY_FOR_PICKUP', data.data.awbNumber, data.data.provider);
      } else {
        alert(data.error || 'Failed to create shipment');
      }
    } catch (err: any) {
      console.error('Create shipment error:', err);
      alert('An error occurred while creating shipment');
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!activeShipment) return;
    try {
      setIsGeneratingLabel(true);
      const res = await fetch(`/api/shipments/${activeShipment.id}/label`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalShipments((prev) =>
          prev.map((s) => (s.id === activeShipment.id ? { ...s, labelUrl: data.data.labelUrl, status: 'LABEL_GENERATED' } : s))
        );
        window.open(data.data.labelUrl || `/api/shipments/${activeShipment.id}/label?raw=true`, '_blank');
      } else {
        alert(data.error || 'Failed to generate shipping label');
      }
    } catch (err) {
      console.error('Label generation error:', err);
      alert('Failed to generate shipping label');
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleSchedulePickup = async () => {
    if (!activeShipment) return;
    try {
      setIsSchedulingPickup(true);
      const res = await fetch(`/api/shipments/${activeShipment.id}/pickup`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalShipments((prev) =>
          prev.map((s) =>
            s.id === activeShipment.id
              ? { ...s, status: 'PICKUP_SCHEDULED', pickupScheduledAt: data.data.pickupScheduledAt }
              : s
          )
        );
        await onUpdateStatus(subOrder.id, 'READY_FOR_PICKUP', activeShipment.awbNumber || '', activeShipment.provider);
      } else {
        alert(data.error || 'Failed to schedule pickup');
      }
    } catch (err) {
      console.error('Schedule pickup error:', err);
      alert('Failed to schedule pickup');
    } finally {
      setIsSchedulingPickup(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5 transition-all hover:border-indigo-200">
      {/* Sub-Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              Vendor Fulfillment
            </span>
            <h3 className="text-base font-extrabold text-slate-900">{subOrder.subOrderNumber}</h3>
            <span className="text-xs font-bold text-slate-400">
              (Order #{subOrder.order.orderNumber})
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
            ) : subOrder.status === 'SHIPPED' || subOrder.status === 'READY_FOR_PICKUP' ? (
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

      {/* Package Contents */}
      <div className="space-y-2">
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
                className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <Image
                      src={product.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                      alt={product.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{product.title}</h4>
                    {attributeEntries.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {attributeEntries.map(([k, v]) => {
                          const displayV = Array.isArray(v) ? v.join(', ') : String(v);
                          const isColor = k.toLowerCase().includes('color');
                          const colorStyle = isColor ? getColorStyle(displayV) : null;
                          return (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
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

      {/* Shipment & Fulfillment Workflow Action Controls */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            Fulfillment & Shipment Workflow
          </span>

          {activeShipment && (
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>{showTimeline ? 'Hide Tracking History' : 'Live Courier Tracking'}</span>
              {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Step-by-Step Fulfillment Pipeline Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {subOrder.status === 'PENDING' && (
            <button
              onClick={() => handleNextFulfillmentStep('CONFIRMED')}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              1. Confirm Order
            </button>
          )}

          {subOrder.status === 'CONFIRMED' && (
            <button
              onClick={() => handleNextFulfillmentStep('PROCESSING')}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
            >
              2. Start Processing
            </button>
          )}

          {subOrder.status === 'PROCESSING' && (
            <button
              onClick={() => handleNextFulfillmentStep('PACKED')}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all"
            >
              3. Mark Packed & Ready
            </button>
          )}

          {/* Create Shipment button */}
          {(subOrder.status === 'PACKED' || subOrder.status === 'CONFIRMED' || subOrder.status === 'PROCESSING') && !activeShipment && (
            <button
              onClick={handleCreateShipment}
              disabled={isCreatingShipment}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isCreatingShipment ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Creating Shipment...
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  Create Shipment (Generate AWB)
                </>
              )}
            </button>
          )}

          {/* Actions when active Shipment exists */}
          {activeShipment && (
            <>
              <button
                onClick={handleGenerateLabel}
                disabled={isGeneratingLabel}
                className="px-3.5 py-2 rounded-xl bg-white text-indigo-700 font-bold text-xs border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-1.5"
              >
                {isGeneratingLabel ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                )}
                {activeShipment.labelUrl ? 'View Shipping Label' : 'Generate Label'}
              </button>

              {activeShipment.status !== 'PICKUP_SCHEDULED' && activeShipment.status !== 'DELIVERED' && (
                <button
                  onClick={handleSchedulePickup}
                  disabled={isSchedulingPickup}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  {isSchedulingPickup ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CalendarDays className="w-3.5 h-3.5" />
                  )}
                  Schedule Courier Pickup
                </button>
              )}
            </>
          )}
        </div>

        {/* Active Shipment Info Badge */}
        {activeShipment && (
          <div className="p-3 rounded-xl bg-white border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">Courier:</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold uppercase text-[11px]">
                {activeShipment.provider}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-extrabold text-slate-900">AWB:</span>
              <span className="font-mono text-indigo-700 font-bold">{activeShipment.awbNumber || 'Pending'}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Status: <strong className="text-slate-900">{activeShipment.status}</strong></span>
              {activeShipment.trackingUrl && (
                <a
                  href={activeShipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Track</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Live Courier Tracking History */}
      {showTimeline && activeShipment?.trackingEvents && activeShipment.trackingEvents.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
            Shipment Tracking Events (AWB: {activeShipment.awbNumber})
          </span>
          <div className="divide-y divide-slate-200/60">
            {activeShipment.trackingEvents.map((evt) => (
              <div key={evt.id} className="py-2 flex items-start justify-between text-xs gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {evt.status} — {evt.description}
                  </span>
                  {evt.location && <p className="text-[11px] text-slate-500 font-medium pl-3.5">Location: {evt.location}</p>}
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {new Date(evt.eventTime).toLocaleString('en-IN', {
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
