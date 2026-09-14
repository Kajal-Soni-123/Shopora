'use client';

import React, { useState, useEffect } from 'react';
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

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'categories'>('users');
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);

  // Delete Category Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);

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
      const [usersRes, catRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/categories'),
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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
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
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

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
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Users className="w-4 h-4" /> Users & Vendor Directory
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${activeTab === 'categories'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <FolderTree className="w-4 h-4" /> Category & Dynamic Form Builder
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

        {/* TAB 2: Category & Dynamic Form Builder WITH EDIT AND DELETE FUNCTIONALITY */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">{cat.name}</h3>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {cat._count?.products || 0} Products
                        </span>
                      </div>

                      {/* EDIT AND DELETE ACTIONS */}
                      <div className="flex items-center gap-1">
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
                    <p className="text-[11px] font-mono text-slate-400">Slug: {cat.slug}</p>

                    {cat.parent && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 w-fit">
                        <CornerDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Sub-category of <strong className="font-extrabold">{cat.parent.name}</strong></span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Dynamic Form Fields ({cat.fields?.length || 0}):
                      </span>

                      {(!cat.fields || cat.fields.length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic">No custom fields defined for this category.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {cat.fields.map((f, i) => (
                            <div key={i} className="p-2 bg-slate-50 rounded-xl text-[11px] flex items-center justify-between border border-slate-100">
                              <span className="font-bold text-slate-800">{f.label}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="uppercase text-[9px] font-extrabold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                  {f.type}
                                </span>
                                {f.required && (
                                  <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
