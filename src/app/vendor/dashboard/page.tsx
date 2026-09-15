'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AddProductModal } from '@/components/vendor/AddProductModal';
import { SubOrderCard, VendorSubOrderData } from '@/components/vendor/SubOrderCard';
import { VendorReviewsSection } from '@/components/vendor/VendorReviewsSection';
import VendorSalesAnalyticsSection from '@/components/vendor/VendorSalesAnalyticsSection';
import { VendorOffersSection } from '@/components/vendor/VendorOffersSection';
import { formatCurrency } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import {
  Store,
  Warehouse,
  Plus,
  Package,
  Truck,
  MessageSquare,
  BarChart3,
  Tag,
  Star,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface VendorProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  rating: number;
  reviewsCount: number;
  category: { id: string; name: string };
  createdAt: string;
}

interface VendorSubOrder {
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

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [subOrders, setSubOrders] = useState<VendorSubOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews' | 'sales' | 'offers'>('products');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fulfillment State
  const [fulfillmentInput, setFulfillmentInput] = useState<{ [key: string]: { tracking: string; carrier: string } }>({});
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const fetchVendorData = async () => {
    try {
      setLoadingData(true);
      const [resProducts, resOrders] = await Promise.all([
        fetch('/api/vendor/products'),
        fetch('/api/vendor/orders'),
      ]);

      if (resProducts.ok) {
        const dataP = await resProducts.json();
        setProducts(dataP.data || []);
      }
      if (resOrders.ok) {
        const dataO = await resOrders.json();
        setSubOrders(dataO.data || []);
      }
    } catch (err) {
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'VENDOR') {
        // Not logged in or not a vendor
        return;
      }
      fetchVendorData();
    }
  }, [user, authLoading]);

  const handleUpdateFulfillment = async (subOrderId: string, tracking: string, carrier: string) => {
    try {
      setFulfillingId(subOrderId);
      const res = await fetch('/api/vendor/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subOrderId,
          status: 'SHIPPED',
          trackingNumber: tracking,
          shippingCarrier: carrier,
        }),
      });

      if (res.ok) {
        await fetchVendorData();
      }
    } catch (err) {
      console.error('Fulfillment update error:', err);
    } finally {
      setFulfillingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'VENDOR') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-purple-100 text-purple-700 rounded-3xl mb-4 border border-purple-200">
          <Store className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Merchant Partner Portal Access</h1>
        <p className="text-sm text-slate-600 max-w-md mb-6 font-medium">
          Sign in or register a Merchant Partner account to access your store dashboard, publish products, and manage sub-order fulfillments.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25"
          >
            Sign In to Store
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Global Navbar Header */}
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Vendor Store Sub-Header Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                {user.vendor?.name || 'Boutique Partner Store'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {user.vendor?.warehouseLocation || 'Central Warehouse'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Publish Product
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Active Products</span>
              <span className="text-2xl font-extrabold text-slate-900">{products.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Sub-Orders Assigned</span>
              <span className="text-2xl font-extrabold text-slate-900">{subOrders.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Warehouse Location</span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                {user.vendor?.warehouseLocation || 'Stockholm, SE'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Warehouse className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-slate-200 flex items-center gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Published Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            Sub-Orders Fulfillment ({subOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            Reviews & Comments Analytics
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Sales & Orders Analytics
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`pb-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'offers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            Offers & Discounts
          </button>
        </div>

        {/* Tab 1: Products Table */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            {loadingData ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-semibold">Loading catalog products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No products published yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Click the "Publish Product" button to add your first boutique product to the marketplace.
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                >
                  Publish Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Product</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Rating</th>
                      <th className="py-3.5 px-6 text-right">Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                              <Image src={p.image} alt={p.title} fill sizes="48px" className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{p.title}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-indigo-600">
                          {p.category?.name || 'General'}
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-900">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.stock > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-700">⭐ {p.rating}</td>
                        <td className="py-4 px-6 text-right text-slate-500 font-medium">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sub-Orders Table */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-semibold">Loading assigned sub-orders...</p>
              </div>
            ) : subOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-2">
                <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No sub-orders assigned yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  When customers purchase your items, sub-orders dispatched from your warehouse will appear here for fulfillment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {subOrders.map((so) => (
                  <SubOrderCard
                    key={so.id}
                    subOrder={so}
                    onUpdateFulfillment={handleUpdateFulfillment}
                    isFulfilling={fulfillingId === so.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reviews & Comments Analytics */}
        {activeTab === 'reviews' && <VendorReviewsSection />}

        {/* Tab 4: Sales & Orders Analytics */}
        {activeTab === 'sales' && <VendorSalesAnalyticsSection />}

        {/* Tab 5: Special Occasion Offers & Discounts */}
        {activeTab === 'offers' && <VendorOffersSection vendorProducts={products} />}
      </main>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={fetchVendorData}
      />
    </div>
  );
}
