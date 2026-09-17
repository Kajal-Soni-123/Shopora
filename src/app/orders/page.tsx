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

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching orders from API:', err);
      }

      // Fallback to localStorage list ONLY if API call fails or returns non-success
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('shopora_orders');
        if (stored) {
          try {
            const parsed: Order[] = JSON.parse(stored);
            setOrders(parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          } catch {
            setOrders([]);
          }
        }
      }
      setIsLoading(false);
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
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-xs text-slate-900">My Orders & Packages</span>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {orders.length} Order{orders.length !== 1 ? 's' : ''} Total
          </span>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Orders</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Track package deliveries, view full product details, colors, sizes, and order history.
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <OrderCardSkeleton key={idx} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <ShoppingBag className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">No orders placed yet</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">When you place your first order, all product details and tracking will appear here.</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
            >
              Start Shopping Catalog
            </Link>
          </div>
        ) : null}

        {/* Orders List */}
        {orders.map((order) => {
          const status = statusConfig[order.aggregateStatus] || statusConfig['PROCESSING'];

          // Flatten all items across all sub-orders
          const allOrderItems = order.subOrders.flatMap((sub) =>
            sub.items.map((item) => ({
              ...item,
              vendorName: sub.vendor?.name,
              warehouseLocation: sub.vendor?.warehouseLocation,
              expectedDelivery: sub.expectedDelivery,
              subOrderNumber: sub.subOrderNumber,
            }))
          );

          return (
            <div
              key={order.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-indigo-200 transition-all overflow-hidden"
            >
              {/* Order Header Summary Banner */}
              <div className="bg-slate-50/80 p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                    <h3 className="text-base font-extrabold text-indigo-700">#{order.orderNumber}</h3>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Placed</span>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shipment Packages</span>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      {order.subOrders.length} Sub-Order{order.subOrders.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Total Amount</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(order.totalAmount)}</span>
                  </div>

                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>

                  <Link
                    href={`/orders/${order.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 shrink-0"
                  >
                    <span>Track Order</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Order Items List — Detailed Product Cards */}
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
                          {/* Product Image */}
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/90 shadow-xs">
                            <Image
                              src={product?.image || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800'}
                              alt={product?.title || 'Product Image'}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>

                          {/* Full Product Metadata */}
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

                            {/* Full Product Description */}
                            {product?.description && (
                              <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl line-clamp-2">
                                {product.description}
                              </p>
                            )}

                            {/* Variant Specifications (Color, Size, Material, etc.) */}
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

                            {/* Delivery Date Tag */}
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

                        {/* Price & Quantity Summary */}
                        <div className="flex md:flex-col items-end justify-between md:justify-center w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-right shrink-0">
                          <span className="text-xs text-slate-400 font-medium block">
                            {item.quantity} × {formatCurrency(item.price)}
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
