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
  ExternalLink,
  ShieldCheck,
  Copy,
  Layers,
} from 'lucide-react';
import Image from 'next/image';

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    // Try reading from localStorage or create mock order preview if params.id === 'latest'
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('latest_shopora_order') || localStorage.getItem('latest_nexus_order');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOrder(parsed);
          return;
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Default sample order with sub-orders if no stored order
    const sampleOrder: Order = {
      id: 'ord_sample_981',
      orderNumber: 'ORD-984210',
      customerName: 'Alex Morgan',
      customerEmail: 'alex.morgan@example.com',
      shippingAddress: '742 Evergreen Terrace, Seattle, WA 98101',
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      totalAmount: 538,
      aggregateStatus: 'PROCESSING',
      createdAt: new Date().toISOString(),
      subOrders: [
        {
          id: 'sub_ord_1',
          subOrderNumber: 'ORD-984210-SUB1',
          vendorId: 'vendor_nordic_wear',
          vendor: {
            id: 'vendor_nordic_wear',
            name: 'Nordic Apparel Co.',
            email: 'shipping@nordicapparel.io',
            warehouseLocation: 'Portland, OR (Whse #402)',
            rating: 4.8,
          },
          status: 'SHIPPED',
          subtotal: 349,
          trackingNumber: 'TRK-NOR-84920',
          shippingCarrier: 'FedEx Express',
          createdAt: new Date().toISOString(),
          items: [
            {
              product: {
                id: 'p1',
                title: 'AeroShield Technical Waterproof Parka',
                description: 'Triple-layer GORE-TEX breathable membrane.',
                price: 349,
                stock: 24,
                image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800',
                rating: 4.9,
                reviewsCount: 142,
                vendorId: 'vendor_nordic_wear',
                categoryId: 'cat_outerwear',
              },
              quantity: 1,
              price: 349,
            },
          ],
        },
        {
          id: 'sub_ord_2',
          subOrderNumber: 'ORD-984210-SUB2',
          vendorId: 'vendor_luxe_audio',
          vendor: {
            id: 'vendor_luxe_audio',
            name: 'Luxe Acoustic Labs',
            email: 'logistics@luxeacoustics.com',
            warehouseLocation: 'Austin, TX (Whse #205)',
            rating: 4.95,
          },
          status: 'PROCESSING',
          subtotal: 189,
          trackingNumber: 'TRK-LUX-29104',
          shippingCarrier: 'DHL Ground',
          createdAt: new Date().toISOString(),
          items: [
            {
              product: {
                id: 'p3',
                title: 'Nomad Modular Expandable Backpack 30L',
                description: 'Weatherproof Cordura fabric with magnetic closures.',
                price: 189,
                stock: 35,
                image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800',
                rating: 4.9,
                reviewsCount: 98,
                vendorId: 'vendor_urban_tech',
                categoryId: 'cat_bags',
              },
              quantity: 1,
              price: 189,
            },
          ],
        },
      ],
    };

    setOrder(sampleOrder);
  }, [params.id]);

  const copyToClipboard = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(trk);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  if (!order) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Global Navbar Header */}
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Tracker Sub-Header Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="font-extrabold text-xs text-slate-900">Sub-Orders Fulfillment Tracker</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 pt-8 space-y-8">
        {/* Parent Order Banner */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 mb-1">
                <PackageCheck className="w-4 h-4 text-purple-600" />
                <span>Master Parent Order</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">Order #{order.orderNumber}</h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-slate-500 block font-medium">Master Order Total</span>
                <span className="text-xl font-extrabold text-indigo-600">${order.totalAmount.toFixed(2)}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Customer & Address Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1 font-semibold">Customer Name</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1 font-semibold">Email Address</span>
              <span className="font-bold text-slate-900">{order.customerEmail}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1 font-semibold">Shipping Address</span>
              <span className="font-bold text-slate-900 truncate block">{order.shippingAddress}</span>
            </div>
          </div>
        </div>

        {/* Sub-Orders Partition Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                Sub-Orders Partitioning Breakdown
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                This master order was automatically divided into {order.subOrders.length} independent vendor sub-orders.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {order.subOrders.map((sub, index) => (
              <div
                key={sub.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5"
              >
                {/* Sub-Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                        Sub-Order #{index + 1}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">{sub.subOrderNumber}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5 font-medium">
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        <Warehouse className="w-3.5 h-3.5" />
                        {sub.vendor.name}
                      </span>
                      <span>•</span>
                      <span>{sub.vendor.warehouseLocation}</span>
                    </div>
                  </div>

                  {/* Status & Carrier Pill */}
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs font-medium">
                      <span className="text-slate-400 block">Carrier</span>
                      <span className="font-bold text-slate-900">{sub.shippingCarrier}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        sub.status === 'SHIPPED'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {sub.status === 'SHIPPED' ? (
                        <Truck className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {sub.status}
                    </span>
                  </div>
                </div>

                {/* Tracking Number Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Tracking Number:</span>
                    <span className="font-mono font-bold text-purple-700">{sub.trackingNumber}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(sub.trackingNumber)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedTracking === sub.trackingNumber ? 'Copied!' : 'Copy Tracking'}
                  </button>
                </div>

                {/* Sub-Order Line Items */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700">Package Items ({sub.items.length})</span>
                  <div className="space-y-2">
                    {sub.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <Image
                              src={item.product.image}
                              alt={item.product.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{item.product.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Qty: {item.quantity} × ${item.price}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-900">
                          ${(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-Order Subtotal Footer */}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Sub-Order Package Total</span>
                  <span className="text-sm font-extrabold text-indigo-600">${sub.subtotal.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
