'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  ShoppingBag,
  PackageCheck,
  Store,
  ShieldCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  Layers,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { useAuth } from '@/context/AuthContext';

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: { id: string; name: string }[];
  selectedCategory?: string;
  onCategorySelect?: (catId: string) => void;
  cartCount?: number;
  ordersCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isOpen,
  onClose,
  categories = [],
  selectedCategory = 'all',
  onCategorySelect,
  cartCount = 0,
  ordersCount = 0,
}) => {
  const { user, openAuthModal, logout } = useAuth();

  if (!isOpen) return null;

  const isVendor = user?.role === 'VENDOR';
  const isAdmin = user?.role === 'ADMIN';

  const allCategories = [{ id: 'all', name: 'All Products' }, ...categories];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out Sidebar Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col justify-between border-r border-slate-200/80 animate-in slide-in-from-left duration-300">
          
          {/* Top Section */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <Link href="/" onClick={onClose}>
                <ShoporaLogo variant="full" size="md" subtext="Marketplace" />
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close Navigation Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Account / Sign Out Header Card */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

              {user ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white line-clamp-1">{user.name}</p>
                        <p className="text-[11px] text-slate-300 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      {user.role}
                    </span>
                  </div>

                  {/* Explicit Sign Out Button */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Logged in account</span>
                    <button
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-bold transition-all shadow-sm"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <UserIcon className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white mb-1">Welcome to Shopora</p>
                  <p className="text-xs text-slate-300 mb-4">Sign in to track orders, manage products, or access vendor portal.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        openAuthModal('login');
                      }}
                      className="py-2 px-3 rounded-xl bg-white text-indigo-950 font-extrabold text-xs shadow-sm hover:bg-slate-100 transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        openAuthModal('signup');
                      }}
                      className="py-2 px-3 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 transition-colors border border-indigo-400/30 shadow-sm"
                    >
                      Register
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Core Navigation Links */}
            <div className="p-4 space-y-1 border-b border-slate-100">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Navigation
              </p>

              <Link
                href="/"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span>Marketplace Home</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  <span>My Account Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/orders/latest"
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <PackageCheck className="w-4 h-4 text-indigo-600" />
                  <span>My Orders & Packages</span>
                </div>
                {ordersCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
                    {ordersCount}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </Link>

              {/* Vendor Portal Link */}
              {isVendor && (
                <Link
                  href="/vendor/dashboard"
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Store className="w-4 h-4 text-indigo-600" />
                    <span>Merchant Store Portal</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}

              {/* Admin Portal Link */}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Super Admin Dashboard</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                </Link>
              )}
            </div>

            {/* Dynamic Product Categories List */}
            <div className="p-4 space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Browse Categories
              </p>

              {allCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (onCategorySelect) onCategorySelect(cat.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{cat.name}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Section */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Shopora Marketplace v2.0</span>
            {user && (
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="text-rose-600 font-bold hover:underline flex items-center"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
