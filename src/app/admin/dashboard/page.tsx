'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import { Button } from '@/components/common/Button';
import {
  Users,
  Store,
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Package,
  MapPin,
  Star,
  Layers,
  Loader2,
  CornerDownRight,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  AlertCircle,
  Mail,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { CategoryFormModal, AdminCategory } from '@/components/admin/CategoryFormModal';
import { DeleteCategoryModal } from '@/components/admin/DeleteCategoryModal';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
  _count?: { orders: number };
}

export interface AdminVendor {
  id: string;
  name: string;
  email: string;
  warehouseLocation: string;
  rating: number;
  createdAt: string;
  _count?: { products: number; subOrders: number };
}

export interface AdminCategoryRequest {
  id: string;
  vendorId: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    warehouseLocation: string;
  };
  name: string;
  suggestedParentId?: string | null;
  suggestedParentName?: string | null;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'category-requests'>('users');
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<AdminCategoryRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [preselectedParentId, setPreselectedParentId] = useState<string | null>(null);

  // Delete Category Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

  // Accordion Expand State for Sub-Categories (default collapsed)
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategoryIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchAdminData();
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchAdminData = async () => {
    try {
      setLoadingData(true);
      const [usersRes, catRes, reqRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/category-requests'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const rawUserData = usersData?.data ?? usersData;
        if (rawUserData) {
          setCustomers(rawUserData.customers || []);
          setVendors(rawUserData.vendors || []);
        }
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        const rawCatData = catData?.data ?? catData;
        if (Array.isArray(rawCatData)) {
          setCategories(rawCatData);
        } else if (rawCatData && typeof rawCatData === 'object' && Array.isArray(rawCatData.categories)) {
          setCategories(rawCatData.categories);
        } else {
          setCategories([]);
        }
      } else {
        // Fallback to public categories API if admin endpoint failed
        const fallbackRes = await fetch('/api/categories');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const rawFallback = fallbackData?.data ?? fallbackData;
          if (Array.isArray(rawFallback)) {
            setCategories(rawFallback);
          }
        }
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        const rawReqData = reqData?.data ?? reqData;
        if (Array.isArray(rawReqData)) {
          setCategoryRequests(rawReqData);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const res = await fetch(`/api/admin/category-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          adminNotes: adminNotesInput,
        }),
      });

      if (res.ok) {
        setAdminNotesInput('');
        setRejectingId(null);
        await fetchAdminData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to approve category request');
      }
    } catch (err) {
      console.error('Error approving category request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const res = await fetch(`/api/admin/category-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          adminNotes: adminNotesInput,
        }),
      });

      if (res.ok) {
        setAdminNotesInput('');
        setRejectingId(null);
        await fetchAdminData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to reject category request');
      }
    } catch (err) {
      console.error('Error rejecting category request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setPreselectedParentId(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenAddSubCategoryModal = (parentCat: AdminCategory) => {
    setEditingCategory(null);
    setPreselectedParentId(parentCat.id);
    setExpandedCategoryIds((prev) => ({ ...prev, [parentCat.id]: true }));
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setPreselectedParentId(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenDeleteModal = (cat: AdminCategory) => {
    setCategoryToDelete(cat);
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading Super Admin Control Panel...</p>
        </div>
      </div>
    );
  }

  const totalFields = categories.reduce(
    (acc, cat) => acc + (cat.fields?.length || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => { }} onRemoveItem={() => { }} onProceedToCheckout={() => router.push('/')} />

      {/* Admin Sub-Header Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs py-3">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="font-extrabold text-xs text-slate-900">Super Admin Portal</span>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Signature Application Dark Gradient Banner & Dashboard Command Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Marketplace Operations & Category Builder
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Manage registered platform users, monitor merchant partner stores, and configure category-specific dynamic form fields.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus className="w-5 h-5" />}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 shrink-0 h-11 px-5 rounded-2xl border border-indigo-400/30 transition-all"
            >
              Add Category & Form Fields
            </Button>
          </div>

          {/* High-Contrast Modern Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 relative z-10">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between text-white shadow-sm">
              <div>
                <span className="text-[11px] font-extrabold text-slate-300 block uppercase tracking-wider">Total Customers</span>
                <span className="text-2xl sm:text-3xl font-black text-white">{customers.length}</span>
              </div>
              <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between text-white shadow-sm">
              <div>
                <span className="text-[11px] font-extrabold text-slate-300 block uppercase tracking-wider">Merchant Partners</span>
                <span className="text-2xl sm:text-3xl font-black text-white">{vendors.length}</span>
              </div>
              <div className="p-3 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
                <Store className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between text-white shadow-sm">
              <div>
                <span className="text-[11px] font-extrabold text-slate-300 block uppercase tracking-wider">Active Categories</span>
                <span className="text-2xl sm:text-3xl font-black text-white">{categories.length}</span>
              </div>
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
                <FolderTree className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Users className="w-4 h-4" /> Users & Vendor Directory
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <FolderTree className="w-4 h-4" /> Category & Dynamic Form Builder
          </button>
          <button
            onClick={() => setActiveTab('category-requests')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap relative ${activeTab === 'category-requests'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <FolderPlus className="w-4 h-4" />
            Vendor Category Requests
            {categoryRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white animate-pulse">
                {categoryRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Registered Users & Merchant Directory */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            {/* Customers Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> Registered Customers ({customers.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Customer accounts registered on Shopora</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Total Orders</th>
                      <th className="py-3 px-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          No registered customer accounts found.
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-3 text-slate-500">{c.email}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {c.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-600">{c._count?.orders || 0} orders</td>
                          <td className="py-3 px-3 text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Merchant Partners Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-indigo-600" /> Merchant Partner Stores ({vendors.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Verified vendors and fulfillment warehouse nodes</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Store Name</th>
                      <th className="py-3 px-3">Fulfillment Email</th>
                      <th className="py-3 px-3">Warehouse Location</th>
                      <th className="py-3 px-3">Rating</th>
                      <th className="py-3 px-3">Products</th>
                      <th className="py-3 px-3">Sub-Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {vendors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          No merchant partner stores registered.
                        </td>
                      </tr>
                    ) : (
                      vendors.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{v.name}</td>
                          <td className="py-3 px-3 text-slate-500">{v.email}</td>
                          <td className="py-3 px-3 text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{v.warehouseLocation}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-600">
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {v.rating}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-700">{v._count?.products || 0} products</td>
                          <td className="py-3 px-3 font-bold text-indigo-600">{v._count?.subOrders || 0} sub-orders</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Category & Dynamic Form Builder WITH SUB-CATEGORY CREATION & NESTED HIERARCHY */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {categories.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
                <FolderTree className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No categories created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Click &quot;+ Add Category & Form Fields&quot; above to create your first product category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {categories
                  .filter((cat) => !cat.parentId)
                  .map((cat) => {
                    const subCategories = categories.filter((sub) => sub.parentId === cat.id);

                    return (
                      <div
                        key={cat.id}
                        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between hover:shadow-md transition-all min-h-[290px]"
                      >
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                          {/* ROOT CATEGORY HEADER */}
                          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold text-slate-900">{cat.name}</h3>
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                  {cat._count?.products || 0} Products
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">slug: {cat.slug}</p>
                            </div>

                            {/* PARENT ACTIONS */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenAddSubCategoryModal(cat)}
                                title={`Add sub-category under ${cat.name}`}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Sub Category</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(cat)}
                                title="Edit Category & Fields"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(cat)}
                                title="Delete Category"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* NESTED SUB-CATEGORIES SECTION */}
                          {(() => {
                            const isExpanded = !!expandedCategoryIds[cat.id];
                            return (
                              <div className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-3">
                                {/* ACCORDION HEADER BUTTON */}
                                <button
                                  type="button"
                                  onClick={() => toggleCategoryExpand(cat.id)}
                                  className="w-full flex items-center justify-between text-left font-extrabold text-[11px] text-slate-700 uppercase tracking-wider cursor-pointer select-none group"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <CornerDownRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>Sub-Categories ({subCategories.length})</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                                    <span>{isExpanded ? 'Hide' : 'Show'}</span>
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                                    )}
                                  </div>
                                </button>

                                {/* COLLAPSIBLE CONTENT */}
                                {isExpanded && (
                                  <div className="pt-2 border-t border-slate-200/60 transition-all max-h-64 overflow-y-auto pr-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Sub-Categories List ({subCategories.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAddSubCategoryModal(cat)}
                                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200/80 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Sub-Category</span>
                                      </button>
                                    </div>

                                    {subCategories.length === 0 ? (
                                      <p className="text-[11px] text-slate-400 italic py-1">
                                        No sub-categories added to {cat.name} yet.
                                      </p>
                                    ) : (
                                      <div className="space-y-2.5">
                                        {subCategories.map((sub) => (
                                          <div
                                            key={sub.id}
                                            className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-xs text-slate-900">{sub.name}</span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                  {sub._count?.products || 0} Products
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => handleOpenEditModal(sub)}
                                                  title={`Edit ${sub.name}`}
                                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleOpenDeleteModal(sub)}
                                                  title={`Delete ${sub.name}`}
                                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            <p className="text-[10px] font-mono text-slate-400">slug: {sub.slug}</p>

                                            {/* Sub-category fields */}
                                            {sub.fields && sub.fields.length > 0 && (
                                              <div className="pt-1.5 border-t border-slate-100 space-y-1">
                                                <span className="text-[10px] font-bold text-slate-500 block">
                                                  Fields ({sub.fields.length}):
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {sub.fields.map((f, fi) => (
                                                    <span
                                                      key={fi}
                                                      className="text-[9px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
                                                    >
                                                      {f.label} ({f.type})
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Level 3+ Nested Sub-Categories */}
                                            {(() => {
                                              const childSubCategories = categories.filter((c) => c.parentId === sub.id);
                                              return (
                                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                                      <CornerDownRight className="w-3 h-3 text-indigo-500" />
                                                      Nested ({childSubCategories.length})
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenAddSubCategoryModal(sub)}
                                                      className="text-[9px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200/80 transition-all flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                      <Plus className="w-2.5 h-2.5" />
                                                      <span>+ Sub</span>
                                                    </button>
                                                  </div>

                                                  {childSubCategories.length > 0 && (
                                                    <div className="pl-2 border-l-2 border-indigo-200 space-y-1 mt-1">
                                                      {childSubCategories.map((childSub) => (
                                                        <div
                                                          key={childSub.id}
                                                          className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs flex items-center justify-between"
                                                        >
                                                          <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-800 text-[11px]">{childSub.name}</span>
                                                            <span className="text-[9px] text-slate-400 font-mono">({childSub.slug})</span>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                            <button
                                                              onClick={() => handleOpenEditModal(childSub)}
                                                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                                              title={`Edit ${childSub.name}`}
                                                            >
                                                              <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                              onClick={() => handleOpenDeleteModal(childSub)}
                                                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                              title={`Delete ${childSub.name}`}
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* PARENT DYNAMIC FORM FIELDS FIXED HEIGHT CONTAINER */}
                          <div className="pt-2 space-y-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Parent Category Dynamic Fields ({cat.fields?.length || 0}):
                            </span>

                            <div className="h-28 flex flex-col justify-start overflow-y-auto pr-1 border border-slate-100/80 rounded-2xl p-2.5 bg-slate-50/50">
                              {(!cat.fields || cat.fields.length === 0) ? (
                                <div className="h-full flex items-center justify-center">
                                  <p className="text-[11px] text-slate-400 italic">No custom fields defined for this parent category.</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 w-full">
                                  {cat.fields.map((f, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-white rounded-xl text-[11px] flex items-center justify-between border border-slate-200/80 shadow-2xs"
                                    >
                                      <span className="font-bold text-slate-800">
                                        {f.label}
                                        {f.required && <span className="text-rose-500 font-extrabold ml-1">*</span>}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="uppercase text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {f.type}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Vendor Category Requests Management */}
        {activeTab === 'category-requests' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-600" /> Vendor Category Requests ({categoryRequests.length})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review category suggestions from Merchant Partners. Approving automatically creates the category in the catalog and sends an email notification.
                </p>
              </div>

              {categoryRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  {categoryRequests.filter((r) => r.status === 'PENDING').length} Pending Action
                </span>
              )}
            </div>

            {loadingData ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                <p className="text-xs font-semibold">Loading category requests...</p>
              </div>
            ) : categoryRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <FolderPlus className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No vendor category requests</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  When Merchant Partners submit new category requests, they will appear here for Admin review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Merchant Partner</th>
                      <th className="py-3.5 px-4">Requested Category</th>
                      <th className="py-3.5 px-4">Suggested Parent</th>
                      <th className="py-3.5 px-4">Justification</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions / Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block">{req.vendor?.name || 'Vendor'}</span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {req.vendor?.email}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-black text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {req.name}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-600">
                          {req.suggestedParentName ? (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              {req.suggestedParentName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Top-Level Category</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-600 max-w-xs">
                          <p className="line-clamp-2" title={req.reason || undefined}>
                            {req.reason || 'No justification provided.'}
                          </p>
                        </td>
                        <td className="py-4 px-4 font-extrabold">
                          {req.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                          {req.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-2">
                              {rejectingId === req.id ? (
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                  <input
                                    type="text"
                                    placeholder="Rejection note to vendor..."
                                    value={adminNotesInput}
                                    onChange={(e) => setAdminNotesInput(e.target.value)}
                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                  />
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    disabled={processingId === req.id}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors"
                                  >
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingId(null);
                                      setAdminNotesInput('');
                                    }}
                                    className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleApproveRequest(req.id)}
                                    disabled={processingId === req.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                                  >
                                    {processingId === req.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    Approve & Create
                                  </button>
                                  <button
                                    onClick={() => setRejectingId(req.id)}
                                    disabled={processingId === req.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 transition-all"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-right">
                              {req.adminNotes && (
                                <span className="text-[11px] text-slate-500 block italic">
                                  &quot;{req.adminNotes}&quot;
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Category Form Modal Component */}
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={fetchAdminData}
          editingCategory={editingCategory}
          categories={categories}
          preselectedParentId={preselectedParentId}
        />

        {/* Dedicated Category Delete Modal Component */}
        <DeleteCategoryModal
          categoryToDelete={categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onSuccess={fetchAdminData}
        />
      </main>
    </div>
  );
}
