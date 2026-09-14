'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  PackageCheck,
  Menu,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Store,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { CartItem } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';

function UserNavControls() {
  const { user, openAuthModal, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const isProfileActive = pathname === '/profile';

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAuthModal('login')}
          className="h-10 px-4 flex items-center gap-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all shadow-sm"
        >
          <LogIn className="w-4 h-4 text-indigo-600" />
          <span>Sign In</span>
        </button>
        <button
          onClick={() => openAuthModal('signup')}
          className="hidden sm:flex h-10 px-4 items-center gap-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all shadow-sm"
        >
          <span>Register</span>
        </button>
      </div>
    );
  }

  const isVendor = user.role === 'VENDOR';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`h-10 px-3 flex items-center gap-2 rounded-xl transition-all text-left shrink-0 border ${
          isProfileActive
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
            : 'bg-slate-100/90 text-slate-800 border-slate-200/80 hover:bg-slate-200/70 shadow-sm'
        }`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0 ${
          isProfileActive ? 'bg-white text-indigo-600' : 'bg-gradient-to-tr from-indigo-600 to-sky-500 text-white'
        }`}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex flex-col justify-center leading-none">
          <p className={`text-xs font-bold leading-tight ${isProfileActive ? 'text-white' : 'text-slate-800'}`}>{user.name}</p>
          <p className={`text-[9px] font-extrabold leading-none mt-0.5 uppercase tracking-wider ${isProfileActive ? 'text-indigo-200' : 'text-indigo-600'}`}>{user.role}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isProfileActive ? 'text-white/80' : 'text-slate-400'}`} />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-150"
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            {isVendor && (
              <p className="text-[10px] text-indigo-700 font-bold mt-1 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                🏬 {user.vendor?.name || 'Merchant Partner'}
              </p>
            )}
          </div>
          <div className="py-1">
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Super Admin Dashboard
              </Link>
            )}
            {isVendor && (
              <Link
                href="/vendor/dashboard"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              >
                <Store className="w-4 h-4 text-indigo-600" />
                Merchant Store Portal
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-indigo-600" />
              My Account Profile
            </Link>
            <Link
              href="/orders/latest"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:text-indigo-600 hover:bg-slate-50 font-medium transition-colors"
            >
              <PackageCheck className="w-4 h-4 text-indigo-600" />
              My Orders & Packages
            </Link>
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left border-t border-slate-100 mt-1"
            >
              <LogOut className="w-4 h-4" />
              Sign Out Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  cartItems?: CartItem[];
  onOpenCart?: () => void;
  onOpenSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedCategory?: string;
  onCategorySelect?: (catId: string) => void;
  ordersCount?: number;
  isCartOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItems = [],
  onOpenCart,
  onOpenSidebar,
  searchQuery = '',
  onSearchChange,
  selectedCategory = 'all',
  onCategorySelect,
  ordersCount = 0,
  isCartOpen = false,
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';

  const totalCartCount = (cartItems || []).reduce((acc, item) => acc + item.quantity, 0);

  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);

  // Active route checks
  const isAdminActive = pathname?.startsWith('/admin');
  const isVendorActive = pathname?.startsWith('/vendor');
  const isOrdersActive = pathname?.startsWith('/orders');
  const isCartActive = isCartOpen;

  const handleCategoryClick = (catId: string) => {
    if (onCategorySelect) {
      onCategorySelect(catId);
    }
    if (!isHomePage) {
      router.push(catId === 'all' ? '/' : `/?category=${encodeURIComponent(catId)}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isHomePage && searchQuery.trim() !== '') {
      router.push(`/?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    async function fetchDynamicCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setDbCategories(json.data);
            return;
          }
        }
        const pubRes = await fetch('/api/categories');
        if (pubRes.ok) {
          const pubJson = await pubRes.json();
          if (pubJson.success && Array.isArray(pubJson.data)) {
            setDbCategories(pubJson.data);
          }
        }
      } catch (err) {
        console.error('Error fetching navbar categories:', err);
      }
    }
    fetchDynamicCategories();
  }, []);

  const categoryList = [
    { id: 'all', label: 'All Products' },
    ...dbCategories.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm shadow-slate-200/40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Hamburger Side Navigation Toggle & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-sm flex items-center justify-center shrink-0"
              title="Open Side Navigation Bar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="group flex items-center">
              <ShoporaLogo variant="full" size="md" subtext="Marketplace" />
            </Link>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, vendors, categories..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-100/80 text-sm text-slate-900 pl-10 pr-4 py-2 rounded-xl border border-slate-200/80 outline-none focus:outline-none focus-visible:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 shadow-inner"
              />
            </div>
          </div>

          {/* Right Action Controls - Unified Harmonized Design */}
          <div className="flex items-center gap-2">
            
            {/* User Account Controls */}
            <UserNavControls />

            {/* Merchant Dashboard Access */}
            {user?.role === 'VENDOR' && (
              <Link
                href="/vendor/dashboard"
                className={`h-10 px-3.5 flex items-center gap-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isVendorActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 hover:text-slate-900 shadow-sm'
                }`}
              >
                <Store className={`w-4 h-4 ${isVendorActive ? 'text-white' : 'text-indigo-600'}`} />
                <span className="hidden lg:inline">Store Portal</span>
              </Link>
            )}

            {/* Admin Dashboard Access */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin/dashboard"
                className={`h-10 px-3.5 flex items-center gap-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isAdminActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 hover:text-slate-900 shadow-sm'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${isAdminActive ? 'text-white' : 'text-indigo-600'}`} />
                <span className="hidden lg:inline">Admin Portal</span>
              </Link>
            )}

            {/* Orders & Tracking */}
            <Link
              href="/orders/latest"
              className={`h-10 px-3.5 flex items-center gap-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isOrdersActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 hover:text-slate-900 shadow-sm'
              }`}
            >
              <PackageCheck className={`w-4 h-4 ${isOrdersActive ? 'text-white' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">Orders</span>
              {ordersCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                  isOrdersActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                }`}>
                  {ordersCount}
                </span>
              )}
            </Link>

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className={`h-10 px-4 flex items-center gap-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 border ${
                isCartActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80 hover:text-slate-900 shadow-sm'
              }`}
            >
              <ShoppingBag className={`w-4 h-4 ${isCartActive ? 'text-white' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full shadow-sm ${
                  isCartActive ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                }`}>
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-100">
          {categoryList.map((cat) => {
            const isActive = isHomePage && selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
