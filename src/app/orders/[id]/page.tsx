'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import { Order, SubOrder } from '@/lib/data';
import {
  PackageCheck,
  Truck,
  Warehouse,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  MapPin,
  CalendarDays,
  Package,
  ClipboardList,
  CircleDot,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { getColorStyle } from '@/lib/color-utils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// The 6 canonical tracking stages in order
const TRACKING_STAGES = [
  { status: 'PLACED', label: 'Order Placed' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

interface TrackingTimelineProps {
  sub: SubOrder;
}

function TrackingTimeline({ sub }: TrackingTimelineProps) {
  const history = sub.statusHistory || [];
  const completedStatuses = history.filter((e) => e.completed).map((e) => e.status);
  const lastCompletedIndex = TRACKING_STAGES.reduce((last, stage, idx) => {
    return completedStatuses.includes(stage.status) ? idx : last;
  }, -1);

  return (
    <div className="space-y-3 pt-2">
      {/* Expected Delivery Banner */}
      {sub.expectedDelivery && sub.status !== 'DELIVERED' && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Expected Delivery</p>
              <p className="text-sm font-extrabold text-indigo-900">
                {new Date(sub.expectedDelivery).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <Package className="w-6 h-6 text-indigo-300" />
        </div>
      )}

      {sub.status === 'DELIVERED' && sub.deliveredAt && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <div className="p-1.5 rounded-lg bg-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Delivered On</p>
            <p className="text-sm font-extrabold text-emerald-900">
              {new Date(sub.deliveredAt).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      {/* 6-Stage Visual Timeline */}
      <div className="relative">
        <div className="flex items-start justify-between gap-0 relative">
          {TRACKING_STAGES.map((stage, idx) => {
            const isCompleted = idx <= lastCompletedIndex;
            const isActive = idx === lastCompletedIndex + 1;
            const historyEvent = history.find((e) => e.status === stage.status);

            return (
              <div
                key={stage.status}
                className="flex-1 flex flex-col items-center relative"
              >
                {/* Connector Line (between nodes) */}
                {idx > 0 && (
                  <div
                    className={`absolute left-0 top-4 h-0.5 w-full -translate-x-1/2 z-0 ${
                      isCompleted ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                    style={{ left: '0%', width: '100%' }}
                  />
                )}

                {/* Step Node */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isActive
                      ? 'bg-white border-indigo-500 text-indigo-600 shadow-md shadow-indigo-200/50'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  {isActive && !isCompleted ? (
                    <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <CircleDot className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`text-[9px] font-bold mt-1.5 text-center leading-tight ${
                    isCompleted
                      ? 'text-indigo-700'
                      : isActive
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </p>

                {/* Timestamp if available */}
                {historyEvent?.timestamp && isCompleted && (
                  <p className="text-[8px] text-slate-400 text-center font-medium leading-tight mt-0.5">
                    {new Date(historyEvent.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status History Detail List */}
      {history.filter((e) => e.completed && e.timestamp).length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status Updates</p>
          {history
            .filter((e) => e.completed)
            .map((event, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{event.label}</p>
                  <p className="text-slate-500 font-medium text-[11px]">{event.note}</p>
                </div>
                {event.timestamp && (
                  <p className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(event.timestamp).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    async function loadOrderDetail() {
      const orderId = params?.id as string;
      if (!orderId) return;

      // 1. Try fetching from PostgreSQL database via API
      try {
        const fetchUrl = orderId === 'latest' ? '/api/orders' : `/api/orders/${orderId}`;
        const res = await fetch(fetchUrl);
        const data = await res.json();

        if (data.success && data.data) {
          if (Array.isArray(data.data) && data.data.length > 0) {
            setOrder(data.data[0]); // Most recent order for 'latest'
            return;
          } else if (!Array.isArray(data.data)) {
            setOrder(data.data);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching order detail from API:', err);
      }

      // 2. Look in full orders list fallback in localStorage
      if (typeof window !== 'undefined') {
        const allStored = localStorage.getItem('shopora_orders');
        if (allStored) {
          try {
            const allOrders: Order[] = JSON.parse(allStored);
            let found: Order | undefined;

            if (orderId === 'latest') {
              found = allOrders.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
            } else {
              found = allOrders.find((o) => o.id === orderId);
            }

            if (found) { setOrder(found); return; }
          } catch { /* fall through */ }
        }

        // 3. Fallback: legacy single order key
        const singleStored = localStorage.getItem('latest_shopora_order') || localStorage.getItem('latest_nexus_order');
        if (singleStored) {
          try {
            setOrder(JSON.parse(singleStored));
            return;
          } catch { /* fall through */ }
        }
      }
    }

    loadOrderDetail();
  }, [params?.id]);

  const copyToClipboard = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(trk);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  if (!order) return null;

  const subStatusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    PROCESSING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    SHIPPED: { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Truck className="w-3.5 h-3.5" /> },
    DELIVERED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CANCELLED: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Sub Header */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3.5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              My Orders
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-xs text-slate-900">Order #{order.orderNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Master Order Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 mb-1">
                <PackageCheck className="w-3.5 h-3.5" />
                ORDER DETAILS
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">#{order.orderNumber}</h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Order Total</span>
                <span className="text-xl font-extrabold text-indigo-600">{formatCurrency(order.totalAmount)}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Delivery Address & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block mb-0.5 font-semibold">Shipping Destination</span>
                <span className="font-extrabold text-slate-900">{order.customerName}</span>
                <p className="text-slate-600 mt-0.5 font-medium leading-relaxed">{order.shippingAddress}</p>
                {order.customerPhone && (
                  <span className="text-slate-500 block mt-1 font-semibold">Phone: {order.customerPhone}</span>
                )}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block mb-0.5 font-semibold">Payment</span>
                <span className="font-bold text-slate-900">{order.paymentMethod}</span>
                {order.paymentDetails?.maskedDetails && (
                  <span className="text-slate-500 block font-medium">{order.paymentDetails.maskedDetails}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Orders with Tracking */}
        <div className="space-y-5">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Shipment Tracking
            <span className="text-xs font-bold text-slate-400">({order.subOrders.length} package{order.subOrders.length > 1 ? 's' : ''})</span>
          </h2>

          {order.subOrders.map((sub, index) => {
            const sc = subStatusConfig[sub.status] || subStatusConfig['PROCESSING'];
            return (
              <div
                key={sub.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5"
              >
                {/* Sub-order header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-100">
                        PACKAGE {index + 1}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900">{sub.subOrderNumber}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        <Warehouse className="w-3 h-3" />
                        {sub.vendor.name}
                      </span>
                      <span>•</span>
                      <span>{sub.shippingCarrier}</span>
                      <span>•</span>
                      <span>{sub.vendor.warehouseLocation}</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 shrink-0 ${sc.color}`}>
                    {sc.icon}
                    {sub.status}
                  </span>
                </div>

                {/* Tracking Number */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Tracking ID:</span>
                    <span className="font-mono font-extrabold text-indigo-700">{sub.trackingNumber}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(sub.trackingNumber)}
                    className="flex items-center gap-1.5 font-bold transition-colors"
                  >
                    {copiedTracking === sub.trackingNumber ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </span>
                    )}
                  </button>
                </div>

                {/* 6-Stage Tracking Timeline */}
                <TrackingTimeline sub={sub} />

                {/* Package Items with Full Product Details */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Package Contents ({sub.items.length} item{sub.items.length > 1 ? 's' : ''})
                  </p>

                  <div className="space-y-3">
                    {sub.items.map((item, itemIdx) => {
                      const product = item.product;
                      const attributes = product?.attributes || {};
                      const attributeEntries = Object.entries(attributes);

                      return (
                        <div
                          key={itemIdx}
                          className="flex flex-col sm:flex-row items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/90 gap-4"
                        >
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Product Thumbnail */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/90">
                              <Image
                                src={product?.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                                alt={product?.title || 'Product Image'}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>

                            {/* Details: Title, Description, Variant Badges */}
                            <div className="space-y-1 flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{product?.title}</h4>

                              {product?.description && (
                                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-2xl">
                                  {product.description}
                                </p>
                              )}

                              {/* Specifications / Variant Badges (Color, Size, etc.) */}
                              {attributeEntries.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {attributeEntries.map(([key, val]) => {
                                    const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                                    const isColor = key.toLowerCase().includes('color');
                                    const colorStyle = isColor ? getColorStyle(displayVal) : null;

                                    return (
                                      <span
                                        key={key}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs"
                                      >
                                        {colorStyle && (
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full border ${colorStyle.border}`}
                                            style={{ background: colorStyle.background }}
                                          />
                                        )}
                                        <span className="text-slate-400 font-semibold">{key}:</span>
                                        <span className="text-slate-900 font-extrabold">{displayVal}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 text-right shrink-0">
                            <span className="text-xs text-slate-400 font-medium">
                              Qty: {item.quantity} × {formatCurrency(item.price)}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900">
                              {formatCurrency(item.quantity * item.price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sub-order total */}
                  <div className="pt-3 flex justify-between items-center text-xs border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Package Total</span>
                    <span className="text-sm font-extrabold text-indigo-600">{formatCurrency(sub.subtotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
