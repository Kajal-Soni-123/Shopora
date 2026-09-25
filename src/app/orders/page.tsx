'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import { Order } from '@/lib/data';
import {
  PackageCheck,
  ArrowLeft,
  ShoppingBag,
  ChevronRight,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  CalendarDays,
  Tag,
  Warehouse,
  Info,
  Star,
  X,
  Loader2,
  Send,
  AlertCircle,
  Search,
} from 'lucide-react';
import Image from 'next/image';
import { getColorStyle } from '@/lib/color-utils';

// Format currency in INR
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PROCESSING: {
    label: 'Processing',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

import { OrderCardSkeleton } from '@/components/common/Skeleton';

interface ReviewProductTarget {
  id: string;
  title: string;
  image: string;
}

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Write Review Modal state
  const [reviewTarget, setReviewTarget] = useState<ReviewProductTarget | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error('Error fetching orders from API:', err);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, []);

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
              href="/profile"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-xs text-slate-900">My Orders</span>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {orders.length} Order{orders.length !== 1 ? 's' : ''} Total
          </span>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Orders</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Track package deliveries, view full product details, colors, sizes, and order history.
            </p>
          </div>
        </div>

        {/* Search & Status Filter Tabs Bar */}
        {!isLoading && orders.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                {[
                  { id: 'ALL', label: 'All Orders', count: orders.length },
                  { id: 'PROCESSING', label: 'Processing', count: orders.filter((o) => o.aggregateStatus === 'PROCESSING').length },
                  { id: 'SHIPPED', label: 'Shipped', count: orders.filter((o) => o.aggregateStatus === 'SHIPPED').length },
                  { id: 'DELIVERED', label: 'Delivered', count: orders.filter((o) => o.aggregateStatus === 'DELIVERED').length },
                  { id: 'CANCELLED', label: 'Cancelled', count: orders.filter((o) => o.aggregateStatus === 'CANCELLED').length },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, customer, or item..."
                  className="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <OrderCardSkeleton key={idx} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <ShoppingBag className="w-8 h-8 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No orders placed yet</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">When you place an order, package tracking details will appear here.</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Start Shopping
            </Link>
          </div>
        ) : null}

        {/* Filtered Empty State */}
        {!isLoading && orders.length > 0 && (() => {
          const filteredOrders = orders.filter((order) => {
            if (activeTab !== 'ALL' && order.aggregateStatus !== activeTab) {
              return false;
            }
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              const matchesOrderNumber = order.orderNumber.toLowerCase().includes(q);
              const matchesCustomer = order.customerName.toLowerCase().includes(q);
              const matchesProduct = order.subOrders.some((sub) =>
                sub.items.some((item) => item.product?.title.toLowerCase().includes(q))
              );
              return matchesOrderNumber || matchesCustomer || matchesProduct;
            }
            return true;
          });

          if (filteredOrders.length === 0) {
            return (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-10 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No matching orders found</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Try clearing your search query or selecting a different status filter tab above.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.aggregateStatus] || statusConfig['PROCESSING'];
                const allOrderItems = order.subOrders.flatMap((sub) =>
                  sub.items.map((item) => ({
                    ...item,
                    vendorName: sub.vendor?.name,
                    warehouseLocation: sub.vendor?.warehouseLocation,
                    expectedDelivery: sub.expectedDelivery,
                    subOrderNumber: sub.subOrderNumber,
                    subStatus: sub.status,
                    isDelivered: sub.status === 'DELIVERED' || order.aggregateStatus === 'DELIVERED',
                  }))
                );
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                  >
                    {/* Order Header Summary Banner */}
                    <div className="bg-slate-50/90 p-5 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">Order ID</span>
                          <h3 className="text-base font-bold text-slate-900">#{order.orderNumber}</h3>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">Placed on</span>
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">Packages</span>
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Package className="w-3.5 h-3.5 text-slate-500" />
                            {order.subOrders.length} Package{order.subOrders.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        <div className="text-left sm:text-right">
                          <span className="text-xs text-slate-500 block font-medium">Total</span>
                          <span className="text-lg font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                          <Link
                            href={`/orders/${order.id}`}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <span>Track Order</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Ordered Items ({allOrderItems.length})
                      </span>
                      <div className="divide-y divide-slate-100 space-y-4">
                        {allOrderItems.map((item, idx) => {
                          const product = item.product;
                          const attributes = product?.attributes || {};
                          const attributeEntries = Object.entries(attributes);

                          return (
                            <div
                              key={idx}
                              className={`${idx > 0 ? 'pt-4' : ''} flex flex-col md:flex-row items-start justify-between gap-5`}
                            >
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/90 shadow-xs">
                                  <Image
                                    src={product?.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                                    alt={product?.title || 'Product Image'}
                                    fill
                                    sizes="96px"
                                    className="object-cover"
                                  />
                                </div>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {item.vendorName && (
                                      <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Warehouse className="w-3 h-3" />
                                        {item.vendorName}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold text-slate-400">Pkg #{item.subOrderNumber}</span>
                                  </div>

                                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{product?.title}</h4>

                                  {product?.description && (
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl line-clamp-2">
                                      {product.description}
                                    </p>
                                  )}

                                  {attributeEntries.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {attributeEntries.map(([key, val]) => {
                                        const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                                        const isColor = key.toLowerCase().includes('color');
                                        const colorStyle = isColor ? getColorStyle(displayVal) : null;

                                        return (
                                          <span
                                            key={key}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700"
                                          >
                                            {colorStyle && (
                                              <span
                                                className={`w-3 h-3 rounded-full border ${colorStyle.border}`}
                                                style={{ background: colorStyle.background }}
                                              />
                                            )}
                                            <span className="text-slate-500 font-semibold">{key}:</span>
                                            <span className="text-slate-900 font-extrabold">{displayVal}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {item.expectedDelivery && (
                                    <p className="text-xs text-indigo-600 font-bold flex items-center gap-1 pt-1">
                                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                                      Estimated Delivery:{' '}
                                      <span className="text-indigo-900">
                                        {new Date(item.expectedDelivery).toLocaleDateString('en-IN', {
                                          weekday: 'short',
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex md:flex-col items-end justify-between md:justify-center w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-right shrink-0 gap-2">
                                <div>
                                  <span className="text-xs text-slate-400 font-medium block">
                                    {item.quantity} × {formatCurrency(item.price)}
                                  </span>
                                  <span className="text-base font-black text-slate-900">
                                    {formatCurrency(item.quantity * item.price)}
                                  </span>
                                </div>

                                {product?.id && (
                                  item.isDelivered ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal({ id: product.id, title: product.title, image: product.image })}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-current" />
                                      <span>Write Review</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold border border-slate-200">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Review available upon delivery</span>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </main>

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
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-extrabold text-emerald-900">Review Submitted!</h4>
                <p className="text-xs text-emerald-700 font-medium">{reviewSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || userRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {hoverRating || userRating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Your Review Comment</label>
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your experience with product quality, material, fit, and delivery..."
                    className="w-full p-3.5 rounded-2xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseReviewModal}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Product Review
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
