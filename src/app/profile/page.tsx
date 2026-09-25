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
  Phone,
  Home,
  Briefcase,
  Check,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, openAuthModal, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [primaryAddressType, setPrimaryAddressType] = useState<'HOME' | 'WORK'>('HOME');
  const [vendorName, setVendorName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    homeAddress?: string;
    workAddress?: string;
  }>({});

  // Global Navigation Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setHomeAddress(user.homeAddress || '');
      setWorkAddress(user.workAddress || '');
      setPrimaryAddressType((user.primaryAddressType as 'HOME' | 'WORK') || 'HOME');
      if (user.vendor) {
        setVendorName(user.vendor.name || '');
        setWarehouseLocation(user.vendor.warehouseLocation || '');
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

  const validateForm = () => {
    const errs: { name?: string; phone?: string; homeAddress?: string; workAddress?: string } = {};

    if (!name || name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters long.';
    } else if (name.trim().length > 100) {
      errs.name = 'Full name must not exceed 100 characters.';
    }

    if (phone && phone.trim() !== '') {
      const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        errs.phone = 'Please enter a valid phone number (e.g. +1 555-019-2834 or +91 9876543210).';
      }
    }

    if (homeAddress && homeAddress.length > 500) {
      errs.homeAddress = 'Home address must not exceed 500 characters.';
    }

    if (workAddress && workAddress.length > 500) {
      errs.workAddress = 'Work address must not exceed 500 characters.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          homeAddress,
          workAddress,
          primaryAddressType,
          vendorName: isVendor ? vendorName : undefined,
          warehouseLocation: isVendor ? warehouseLocation : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update profile');
      }

      if (json.data) {
        updateUser(json.data);
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setFieldErrors({});
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Global Navbar Header */}
      <Navbar onOpenSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} isCartOpen={isCartOpen} />
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={[]} onUpdateQuantity={() => {}} onRemoveItem={() => {}} onProceedToCheckout={() => router.push('/')} />

      {/* Profile Sub-Header Bar */}
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
            <UserIcon className="w-4 h-4 text-indigo-600" />
            <span className="font-extrabold text-xs text-slate-900">User Account Profile</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Profile Header Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-5 z-10 w-full sm:w-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900">{user.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {user.role}
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">{user.email}</p>
              {isVendor && (
                <p className="text-xs text-slate-600 font-medium mt-1 flex items-center justify-center sm:justify-start">
                  <Store className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Store: {user.vendor?.name || 'Nordic Outerwear Boutique'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Alerts */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center space-x-3 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center space-x-3 text-xs font-semibold animate-in fade-in">
            <span>{saveError}</span>
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

              <form noValidate onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                      className={`w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border ${
                        fieldErrors.name ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                      } outline-none focus:bg-white transition-all font-medium`}
                    />
                    {fieldErrors.name && (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-in fade-in">
                        {fieldErrors.name}
                      </p>
                    )}
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

                {/* Contact Information / Phone Number */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>Contact Information</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        disabled={!isEditing}
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: undefined });
                        }}
                        className={`w-full pl-10 bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border ${
                          fieldErrors.phone ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                        } outline-none focus:bg-white transition-all font-medium`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-in fade-in">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Saved Addresses Section */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>Saved Addresses</span>
                  </div>

                  {/* Home Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Home Address</span>
                      </label>
                      {primaryAddressType === 'HOME' ? (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white border border-indigo-700 text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3" /> Primary Delivery
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrimaryAddressType('HOME')}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 text-[10px] font-bold uppercase transition-all"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      disabled={!isEditing}
                      placeholder="Enter your home delivery address (Street, City, State, ZIP)..."
                      value={homeAddress}
                      onChange={(e) => {
                        setHomeAddress(e.target.value);
                        if (fieldErrors.homeAddress) setFieldErrors({ ...fieldErrors, homeAddress: undefined });
                      }}
                      className={`w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border ${
                        fieldErrors.homeAddress ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                      } outline-none focus:bg-white transition-all font-medium resize-none`}
                    />
                    {fieldErrors.homeAddress && (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-in fade-in">
                        {fieldErrors.homeAddress}
                      </p>
                    )}
                  </div>

                  {/* Work Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                        <span>Work Address</span>
                      </label>
                      {primaryAddressType === 'WORK' ? (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white border border-indigo-700 text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3" /> Primary Delivery
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrimaryAddressType('WORK')}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 text-[10px] font-bold uppercase transition-all"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      disabled={!isEditing}
                      placeholder="Enter your office or work address (Building, Suite, Street, City, State, ZIP)..."
                      value={workAddress}
                      onChange={(e) => {
                        setWorkAddress(e.target.value);
                        if (fieldErrors.workAddress) setFieldErrors({ ...fieldErrors, workAddress: undefined });
                      }}
                      className={`w-full bg-slate-50 disabled:bg-slate-100/80 text-sm text-slate-900 px-4 py-2.5 rounded-xl border ${
                        fieldErrors.workAddress ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                      } outline-none focus:bg-white transition-all font-medium resize-none`}
                    />
                    {fieldErrors.workAddress && (
                      <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-in fade-in">
                        {fieldErrors.workAddress}
                      </p>
                    )}
                  </div>
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
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
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
                  href="/orders"
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
