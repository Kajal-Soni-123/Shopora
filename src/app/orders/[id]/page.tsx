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
  ExternalLink,
  FileText,
  X,
  Navigation,
  Activity,
  RotateCcw,
  AlertTriangle,
  Star,
  Loader2,
  Send,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { getColorStyle } from '@/lib/color-utils';
import { CancelOrderModal } from '@/components/CancelOrderModal';
import { ReturnItemModal } from '@/components/ReturnItemModal';
import { ReturnTimeline } from '@/components/ReturnTimeline';

interface ReviewProductTarget {
  id: string;
  title: string;
  image: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// Canonical tracking stages
const TRACKING_STAGES = [
  { status: 'PLACED', label: 'Order Placed' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'READY_FOR_PICKUP', label: 'Pickup Scheduled' },
  { status: 'SHIPPED', label: 'In Transit' },
  { status: 'DELIVERED', label: 'Delivered' },
];

interface ExtendedSubOrder extends SubOrder {
  shipments?: {
    id: string;
    provider: string;
    awbNumber?: string;
    trackingUrl?: string;
    status: string;
    labelUrl?: string;
    pickupScheduledAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
    trackingEvents?: {
      id: string;
      status: string;
      location?: string;
      description: string;
      eventTime: string;
    }[];
  }[];
}

interface TrackingTimelineProps {
  sub: ExtendedSubOrder;
}

function TrackingTimeline({ sub }: TrackingTimelineProps) {
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const activeShipment = sub.shipments?.[0];
  const trackingEvents = activeShipment?.trackingEvents || [];
  const history = sub.statusHistory || [];

  // Derive completed step index based on SubOrder status or Shipment status
  let lastCompletedIndex = 0;
  const currentSubStatus = (sub.status || '').toUpperCase();

  if (currentSubStatus === 'CONFIRMED') lastCompletedIndex = 1;
  else if (currentSubStatus === 'PROCESSING') lastCompletedIndex = 1;
  else if (currentSubStatus === 'PACKED') lastCompletedIndex = 2;
  else if (currentSubStatus === 'READY_FOR_PICKUP') lastCompletedIndex = 3;
  else if (currentSubStatus === 'SHIPPED' || currentSubStatus === 'IN_TRANSIT') lastCompletedIndex = 4;
  else if (currentSubStatus === 'DELIVERED') lastCompletedIndex = 5;

  const isRealExternalUrl =
    activeShipment?.trackingUrl &&
    !activeShipment.trackingUrl.includes('track.shopora.com') &&
    activeShipment.trackingUrl.startsWith('http') &&
    !activeShipment.trackingUrl.includes('localhost');

  return (
    <div className="space-y-4 pt-2">
      {/* Active Shipment Banner */}
      {activeShipment && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black tracking-wider uppercase">
                {activeShipment.provider} EXPRESS
              </span>
              <span className="font-mono text-xs font-bold text-indigo-900">
                AWB: {activeShipment.awbNumber || 'Generating...'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              Shipment Status: <strong className="text-indigo-950 font-extrabold">{activeShipment.status}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRealExternalUrl ? (
              <a
                href={activeShipment.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white text-indigo-600 font-extrabold text-xs border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>Live Courier Tracking</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Tracking View</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expected Delivery Banner */}
      {sub.expectedDelivery && sub.status !== 'DELIVERED' && (
        <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Estimated Delivery</p>
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

      {/* Visual Progress Bar Timeline */}
      <div className="relative pt-2">
        <div className="flex items-start justify-between gap-0 relative">
          {TRACKING_STAGES.map((stage, idx) => {
            const isCompleted = idx <= lastCompletedIndex;
            const isActive = idx === lastCompletedIndex;

            return (
              <div key={stage.status} className="flex-1 flex flex-col items-center relative">
                {idx > 0 && (
                  <div
                    className={`absolute left-0 top-4 h-0.5 w-full -translate-x-1/2 z-0 ${
                      isCompleted ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                    style={{ left: '0%', width: '100%' }}
                  />
                )}

                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isActive
                      ? 'bg-white border-indigo-500 text-indigo-600 shadow-md shadow-indigo-200/50'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <CircleDot className="w-3.5 h-3.5" />}
                </div>

                <p
                  className={`text-[9px] font-bold mt-1.5 text-center leading-tight ${
                    isCompleted ? 'text-indigo-700' : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Live Tracking Modal */}
      {isTrackingModalOpen && activeShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Live Courier Tracking</h3>
                  <p className="text-xs text-slate-500 font-medium">Shopora Express Logistics • Real-time Status</p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AWB & Status Info */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">AWB Tracking Number:</span>
                <span className="font-mono font-extrabold text-indigo-700">{activeShipment.awbNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Current Courier Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {activeShipment.status}
                </span>
              </div>
              {sub.expectedDelivery && (
                <div className="flex items-center justify-between text-xs font-medium pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Estimated Delivery Date:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(sub.expectedDelivery).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Live Hub Event Timeline */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tracking Event Logs</p>

              <div className="space-y-3 relative pl-4 border-l-2 border-indigo-200">
                {trackingEvents.length > 0 ? (
                  trackingEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">{evt.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(evt.eventTime).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{evt.description}</p>
                      {evt.location && <p className="text-[11px] text-slate-400 font-medium">Hub: {evt.location}</p>}
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <div className="relative space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">PICKUP_SCHEDULED</span>
                        <span className="text-[10px] text-slate-400 font-mono">Today, Just Now</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Package manifest created & courier pickup assigned</p>
                      <p className="text-[11px] text-slate-400 font-medium">Hub: Vendor Warehouse Facility</p>
                    </div>
                    <div className="relative space-y-0.5">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">MANIFEST_CREATED</span>
                        <span className="text-[10px] text-slate-400 font-mono">Today, Earlier</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Shipment record created in system</p>
                      <p className="text-[11px] text-slate-400 font-medium">Hub: Shopora Logistics Central</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition-colors"
              >
                Close Tracking View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Cancellation Modal State
  const [cancelModalState, setCancelModalState] = useState<{
    isOpen: boolean;
    orderId: string;
    subOrderId?: string;
    orderItemId?: string;
    itemTitle?: string;
  }>({
    isOpen: false,
    orderId: '',
  });

  // Return Modal State
  const [returnModalState, setReturnModalState] = useState<{
    isOpen: boolean;
    orderItemId: string;
    itemTitle: string;
    itemPrice: number;
    maxQuantity: number;
  }>({
    isOpen: false,
    orderItemId: '',
    itemTitle: '',
    itemPrice: 0,
    maxQuantity: 1,
  });

  // Write Review Modal state
  const [reviewTarget, setReviewTarget] = useState<ReviewProductTarget | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<string>('');

  const handleOpenReviewModal = (product: { id: string; title: string; image: string }) => {
    setReviewTarget(product);
    setUserRating(5);
    setHoverRating(0);
    setCommentText('');
    setReviewError('');
    setReviewSuccess('');
  };

  const handleCloseReviewModal = () => {
    setReviewTarget(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    if (!commentText.trim()) {
      setReviewError('Please enter your review comment');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reviewTarget.id,
          rating: userRating,
          comment: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewError(data.error || 'Failed to submit review. Ensure you are signed in.');
      } else {
        setReviewSuccess('Thank you! Your verified product review has been submitted.');
        setTimeout(() => {
          setReviewTarget(null);
        }, 1800);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError('Network error submitting review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const loadOrderDetail = async () => {
    const orderId = params?.id as string;
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const fetchUrl = orderId === 'latest' ? '/api/orders' : `/api/orders/${orderId}`;
      const res = await fetch(fetchUrl);
      const data = await res.json();

      if (data.success && data.data) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          setOrder(data.data[0]);
        } else if (!Array.isArray(data.data)) {
          setOrder(data.data);
        } else {
          setOrder(null);
        }
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error('Error fetching order detail from API:', err);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [params?.id]);

  const copyToClipboard = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(trk);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const subStatusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    CONFIRMED: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    PROCESSING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    PACKED: { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <PackageCheck className="w-3.5 h-3.5" /> },
    READY_FOR_PICKUP: { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Truck className="w-3.5 h-3.5" /> },
    SHIPPED: { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Truck className="w-3.5 h-3.5" /> },
    DELIVERED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CANCELLED: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
        <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
        <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-700">Loading order details...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
        <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
        <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Order Not Found</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">No order details were found matching this request in your account.</p>
            </div>
            <Link
              href="/orders"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
            >
              View My Orders List
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Sub Header */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3.5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
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

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
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

              {/* Cancel Entire Order Button */}
              {['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP'].includes(order.aggregateStatus) && (
                <button
                  type="button"
                  onClick={() =>
                    setCancelModalState({
                      isOpen: true,
                      orderId: order.id,
                    })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Delivery Destination */}
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
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Orders / Packages with Live Shipment Tracking */}
        <div className="space-y-5">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Shipments & Packages ({order.subOrders.length} package{order.subOrders.length > 1 ? 's' : ''})
          </h2>

          {order.subOrders.map((sub: any, index: number) => {
            const sc = subStatusConfig[sub.status] || subStatusConfig['PROCESSING'];
            const isSubCancellable = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP'].includes(sub.status);

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
                        {sub.vendor?.name}
                      </span>
                      <span>•</span>
                      <span>{sub.shippingCarrier || 'Standard Delivery'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${sc.color}`}>
                      {sc.icon}
                      {sub.status}
                    </span>
                    {isSubCancellable && (
                      <button
                        type="button"
                        onClick={() =>
                          setCancelModalState({
                            isOpen: true,
                            orderId: order.id,
                            subOrderId: sub.id,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition-colors"
                      >
                        Cancel Package
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking Number */}
                {sub.trackingNumber && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Tracking AWB:</span>
                      <span className="font-mono font-extrabold text-indigo-700">{sub.trackingNumber}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(sub.trackingNumber || '')}
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
                          Copy AWB
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* 6-Stage Tracking Timeline & Live Courier Events */}
                <TrackingTimeline sub={sub} />

                {/* Package Items */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Package Items ({sub.items.length} item{sub.items.length > 1 ? 's' : ''})
                  </p>

                  <div className="space-y-3">
                    {sub.items.map((item: any, itemIdx: number) => {
                      const product = item.product;
                      const attributes = product?.attributes || {};
                      const attributeEntries = Object.entries(attributes);
                      const isItemCancellable = isSubCancellable && item.status !== 'CANCELLED';
                      const isItemReturnable = sub.status === 'DELIVERED' && (!item.status || item.status === 'ACTIVE' || item.status === 'DELIVERED');
                      const hasReturnRequest = item.returnRequest;

                      return (
                        <div key={itemIdx} className="space-y-2">
                          <div
                            className="flex flex-col sm:flex-row items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/90 gap-4"
                          >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/90">
                                <Image
                                  src={product?.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                                  alt={product?.title || 'Product Image'}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              </div>

                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{product?.title}</h4>
                                  {item.status === 'CANCELLED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Cancelled</span>
                                  )}
                                  {item.status === 'RETURN_REQUESTED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Return Pending</span>
                                  )}
                                  {item.status === 'RETURNED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Returned & Refunded</span>
                                  )}
                                </div>
                                {attributeEntries.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {attributeEntries.map(([key, val]) => {
                                      const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                                      const isColor = key.toLowerCase().includes('color');
                                      const colorStyle = isColor ? getColorStyle(displayVal) : null;
                                      return (
                                        <span
                                          key={key}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700"
                                        >
                                          {colorStyle && (
                                            <span
                                              className={`w-2 h-2 rounded-full border ${colorStyle.border}`}
                                              style={{ background: colorStyle.background }}
                                            />
                                          )}
                                          <span className="text-slate-400">{key}:</span>
                                          <span className="text-slate-900">{displayVal}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className="text-xs font-bold text-slate-800">{item.quantity} × {formatCurrency(item.price)}</span>
                              
                              <div className="flex items-center gap-2">
                                {isItemCancellable && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCancelModalState({
                                        isOpen: true,
                                        orderId: order.id,
                                        subOrderId: sub.id,
                                        orderItemId: item.id,
                                        itemTitle: product?.title,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 transition-colors"
                                  >
                                    Cancel Item
                                  </button>
                                )}

                                {isItemReturnable && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReturnModalState({
                                        isOpen: true,
                                        orderItemId: item.id,
                                        itemTitle: product?.title || 'Product Item',
                                        itemPrice: item.price,
                                        maxQuantity: item.quantity,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Return Item
                                  </button>
                                )}

                                {product?.id && (sub.status === 'DELIVERED' || order.aggregateStatus === 'DELIVERED') && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenReviewModal({
                                        id: product.id,
                                        title: product.title,
                                        image: product.image,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Star className="w-3 h-3 fill-current" />
                                    Write Review
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Embedded Return Timeline if Active Return exists */}
                          {hasReturnRequest && (
                            <ReturnTimeline
                              status={hasReturnRequest.status}
                              requestedAt={hasReturnRequest.createdAt}
                              reverseAwb={hasReturnRequest.reverseAwb}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={cancelModalState.isOpen}
        onClose={() => setCancelModalState((prev) => ({ ...prev, isOpen: false }))}
        orderId={cancelModalState.orderId}
        subOrderId={cancelModalState.subOrderId}
        orderItemId={cancelModalState.orderItemId}
        itemTitle={cancelModalState.itemTitle}
        onSuccess={loadOrderDetail}
      />

      {/* Return Item Modal */}
      <ReturnItemModal
        isOpen={returnModalState.isOpen}
        onClose={() => setReturnModalState((prev) => ({ ...prev, isOpen: false }))}
        orderItemId={returnModalState.orderItemId}
        itemTitle={returnModalState.itemTitle}
        itemPrice={returnModalState.itemPrice}
        maxQuantity={returnModalState.maxQuantity}
        onSuccess={loadOrderDetail}
      />

      {/* Interactive Write Product Review Modal Overlay */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <Image src={reviewTarget.image} alt={reviewTarget.title} fill className="object-cover" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Verified Purchase Review
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">{reviewTarget.title}</h3>
                </div>
              </div>

              <button
                onClick={handleCloseReviewModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">{reviewSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Overall Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || userRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              active
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200 fill-slate-100'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Review & Experience
                  </label>
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts about product quality, fit, or performance..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-slate-900 font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseReviewModal}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
