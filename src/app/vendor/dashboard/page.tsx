'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/lib/data';
import { AddProductModal } from '@/components/vendor/AddProductModal';
import { RequestCategoryModal } from '@/components/vendor/RequestCategoryModal';
import { VendorProductsSection, VendorProduct } from '@/components/vendor/VendorProductsSection';
import { VendorOrdersSection } from '@/components/vendor/VendorOrdersSection';
import { VendorSubOrderData } from '@/components/vendor/SubOrderCard';
import { VendorCategoryRequestsSection, VendorCategoryRequest } from '@/components/vendor/VendorCategoryRequestsSection';
import { VendorReviewsSection } from '@/components/vendor/VendorReviewsSection';
import VendorSalesAnalyticsSection from '@/components/vendor/VendorSalesAnalyticsSection';
import { VendorOffersSection } from '@/components/vendor/VendorOffersSection';
import { VendorReturnCard, VendorReturnRequestData } from '@/components/vendor/VendorReturnCard';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import {
  Store,
  Warehouse,
  Plus,
  Package,
  Truck,
  MessageSquare,
  BarChart3,
  Tag,
  ArrowLeft,
  Loader2,
  FolderPlus,
  RotateCcw,
} from 'lucide-react';

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [subOrders, setSubOrders] = useState<VendorSubOrderData[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<VendorCategoryRequest[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'products' | 'orders' | 'returns' | 'reviews' | 'sales' | 'offers' | 'category-requests'
  >('products');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryRequestModalOpen, setIsCategoryRequestModalOpen] = useState(false);

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fulfillment State
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const fetchVendorData = async () => {
    try {
      setLoadingData(true);
      const [resProducts, resOrders, resRequests, resReturns] = await Promise.all([
        fetch('/api/vendor/products'),
        fetch('/api/vendor/orders'),
        fetch('/api/vendor/category-requests'),
        fetch('/api/returns'),
      ]);

      let dbSubOrders: any[] = [];
      if (resProducts.ok) {
        const dataP = await resProducts.json();
        setProducts(dataP.data || []);
      }
      if (resOrders.ok) {
        const dataO = await resOrders.json();
        dbSubOrders = dataO.data || [];
      }
      if (resRequests.ok) {
        const dataR = await resRequests.json();
        setCategoryRequests(dataR.data || []);
      }
      if (resReturns.ok) {
        const dataRet = await resReturns.json();
        setReturnRequests(dataRet.data || []);
      }

      setSubOrders(dbSubOrders);
    } catch (err) {
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'VENDOR') {
        return;
      }
      fetchVendorData();
    }
  }, [user, authLoading]);

  const handleUpdateStatus = async (
    subOrderId: string,
    status: string,
    trackingNumber: string,
    shippingCarrier: string,
    note?: string
  ) => {
    try {
      setFulfillingId(subOrderId);

      // Send update to API
      await fetch('/api/vendor/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subOrderId,
          status,
          trackingNumber,
          shippingCarrier,
          note,
        }),
      });

      await fetchVendorData();
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setFulfillingId(null);
    }
  };

  const handleDeleteCategoryRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/category-requests/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchVendorData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to delete category request.');
      }
    } catch (err) {
      console.error('Delete category request error:', err);
      alert('An unexpected error occurred while deleting category request.');
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
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors py-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{user.vendor?.name || 'Boutique Partner Store'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {user.vendor?.warehouseLocation || 'Central Warehouse'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoryRequestModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              Request New Category
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Publish Product
            </button>
          </div>
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
        <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            Orders ({subOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-purple-600" />
            Returns ({returnRequests.length})
            {returnRequests.filter(r => r.status === 'RETURN_REQUESTED').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                {returnRequests.filter(r => r.status === 'RETURN_REQUESTED').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('category-requests')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'category-requests'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            Category Requests ({categoryRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Sales
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'offers'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            Discounts
          </button>
        </div>

        {/* Modular Tab Content */}
        {activeTab === 'products' && (
          <VendorProductsSection
            products={products}
            loadingData={loadingData}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onProductUpdated={fetchVendorData}
          />
        )}

        {activeTab === 'orders' && (
          <VendorOrdersSection
            subOrders={subOrders}
            loadingData={loadingData}
            onUpdateStatus={handleUpdateStatus}
            updatingId={fulfillingId}
          />
        )}

        {activeTab === 'returns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Customer Return & Refund Requests ({returnRequests.length})
              </h3>
            </div>

            {loadingData ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              </div>
            ) : returnRequests.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <RotateCcw className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Return Requests</p>
                <p className="text-xs text-slate-500 font-medium">There are currently no return requests submitted for your store's products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {returnRequests.map((rr) => (
                  <VendorReturnCard
                    key={rr.id}
                    returnRequest={rr}
                    onRefresh={fetchVendorData}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'category-requests' && (
          <VendorCategoryRequestsSection
            categoryRequests={categoryRequests}
            loadingData={loadingData}
            onOpenCategoryRequestModal={() => setIsCategoryRequestModalOpen(true)}
            onDeleteCategoryRequest={handleDeleteCategoryRequest}
          />
        )}

        {activeTab === 'reviews' && <VendorReviewsSection />}

        {activeTab === 'sales' && <VendorSalesAnalyticsSection />}

        {activeTab === 'offers' && <VendorOffersSection vendorProducts={products} />}
      </main>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={fetchVendorData}
      />

      {/* Request Category Modal */}
      <RequestCategoryModal
        isOpen={isCategoryRequestModalOpen}
        onClose={() => setIsCategoryRequestModalOpen(false)}
        onRequestSubmitted={fetchVendorData}
      />
    </div>
  );
}
