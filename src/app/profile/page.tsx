'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Store,
  MapPin,
  PackageCheck,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Save,
  KeyRound,
  Building,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, openAuthModal } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('742 Evergreen Terrace, Seattle, WA 98101');
  const [vendorName, setVendorName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      if (user.vendor) {
        setVendorName(user.vendor.name || '');
        setWarehouseLocation(user.vendor.warehouseLocation || 'Stockholm, SE');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
        <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4 border border-indigo-100 shadow-sm">
            <UserIcon className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">My Profile Access</h1>
          <p className="text-sm text-slate-600 max-w-md mb-6 font-medium">
            Sign in to manage your account profile, shipping addresses, orders, and merchant store settings.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuthModal('login')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              Sign In
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isVendor = user.role === 'VENDOR';
  const isAdmin = user.role === 'ADMIN';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Global Navbar Header */}
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Profile Banner Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-5 z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{user.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {user.role}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">{user.email}</p>
              {isVendor && (
                <p className="text-xs text-indigo-200 font-semibold mt-1 flex items-center">
                  <Store className="w-3.5 h-3.5 mr-1 text-indigo-300" />
                  Merchant Store: {user.vendor?.name || 'Nordic Outerwear Boutique'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold rounded-xl backdrop-blur-md transition-all flex items-center justify-center shadow-sm"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center space-x-3 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Main Profile Details Form / Card */}
          <div className="md:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">Personal & Account Information</h2>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-100/80 text-sm text-slate-500 px-4 py-2.5 rounded-xl border border-slate-200 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                {/* Customer Address Section */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isEditing}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium resize-none"
                  />
                </div>

                {/* Vendor Specific Details Section */}
                {isVendor && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
                      <Store className="w-4 h-4 text-indigo-600" />
                      <span>Merchant Partner Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Store / Brand Name
                        </label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                          className="w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Primary Warehouse Location
                        </label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={warehouseLocation}
                          onChange={(e) => setWarehouseLocation(e.target.value)}
                          className="w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Quick Action Side Cards */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Quick Portals Navigation Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Quick Portals</h3>

              <div className="space-y-2">
                <Link
                  href="/orders/latest"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 text-xs font-bold text-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <PackageCheck className="w-4 h-4 text-indigo-600" />
                    <span>My Orders & Packages</span>
                  </div>
                  <span className="text-slate-400">→</span>
                </Link>

                {isVendor && (
                  <Link
                    href="/vendor/dashboard"
                    className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 text-xs font-bold text-indigo-900 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Store className="w-4 h-4 text-indigo-600" />
                      <span>Merchant Store Portal</span>
                    </div>
                    <span className="text-indigo-400">→</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 text-xs font-bold text-indigo-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Super Admin Dashboard</span>
                    </div>
                    <span className="text-indigo-400">→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Account Security & Sign Out Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Account Actions</h3>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="w-full flex items-center justify-center p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4 mr-2 text-rose-600" />
                  Sign Out Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
