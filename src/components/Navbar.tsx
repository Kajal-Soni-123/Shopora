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
  Users,
  Heart,
} from 'lucide-react';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { CartItem } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import { useWishlist } from '@/context/WishlistContext';
import NotificationDrawer from '@/components/NotificationDrawer';

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
              href="/orders"
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

export interface NavbarCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: { id: string; name: string; slug: string }[] | null;
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
  const { activeSession, setIsGroupModalOpen } = useGroupShopping();
  const { wishlistCount, setIsWishlistOpen } = useWishlist();
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';

  const totalCartCount = (cartItems || []).reduce((acc, item) => acc + item.quantity, 0);

  const [dbCategories, setDbCategories] = useState<NavbarCategory[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

  const rootCategories = dbCategories.filter((c) => !c.parentId);

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Left: Hamburger Side Navigation Toggle & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onOpenSidebar}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="group flex items-center">
              <ShoporaLogo variant="full" size="md" subtext="Marketplace" />
            </Link>
          </div>

          {/* Center: Desktop Prominent Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, brands, or categories..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-100/90 hover:bg-slate-100 text-sm text-slate-900 pl-10 pr-4 py-2 rounded-xl border border-slate-200/60 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 md:hidden rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              title="Toggle Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Merchant Dashboard Access */}
            {user?.role === 'VENDOR' && (
              <Link
                href="/vendor/dashboard"
                className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  isVendorActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4 text-slate-500" />
                <span className="hidden lg:inline">Store Portal</span>
              </Link>
            )}

            {/* Admin Dashboard Access */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin/dashboard"
                className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  isAdminActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span className="hidden lg:inline">Admin Portal</span>
              </Link>
            )}

            {/* Group Shopping Party Button */}
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeSession
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">
                {activeSession ? 'Party Active' : 'Group Shop'}
              </span>
              {activeSession && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeSession.members.length}
                </span>
              )}
            </button>

            {/* Orders & Tracking */}
            <Link
              href="/orders"
              className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                isOrdersActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Orders</span>
              {ordersCount > 0 && (
                <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {ordersCount}
                </span>
              )}
            </Link>

            {/* Saved Wishlist Button */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              className="h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
              title="View Wishlist"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span className="hidden sm:inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* In-App Notifications Drawer */}
            <NotificationDrawer />

            {/* User Account Controls */}
            <UserNavControls />

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className={`h-9 px-2.5 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0 ${
                isCartActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="bg-white text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Expand Bar */}
        {showMobileSearch && (
          <div className="pb-3 md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-slate-100 text-sm text-slate-900 pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Category Tabs Bar — Horizontal Scrollable Container */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 relative z-30 border-t border-slate-100 whitespace-nowrap">
          {/* All Products Tab */}
          <button
            onClick={() => handleCategoryClick('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              isHomePage && selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Products
          </button>

          {/* Root Categories with Optional Sub-Category Dropdown */}
          {rootCategories.map((rootCat) => {
            const subCategories = dbCategories.filter((sub) => sub.parentId === rootCat.id);
            const isRootActive = isHomePage && selectedCategory === rootCat.id;
            const isSubActive = isHomePage && subCategories.some((sub) => sub.id === selectedCategory);
            const isCatActive = isRootActive || isSubActive;

            if (subCategories.length === 0) {
              return (
                <button
                  key={rootCat.id}
                  onClick={() => handleCategoryClick(rootCat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isRootActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {rootCat.name}
                </button>
              );
            }

            const isOpen = openDropdownId === rootCat.id;

            return (
              <div
                key={rootCat.id}
                className="relative group"
                onMouseLeave={() => setOpenDropdownId(null)}
              >
                <div
                  className={`flex items-center rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isCatActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <button
                    onClick={() => {
                      handleCategoryClick(rootCat.id);
                      setOpenDropdownId(null);
                    }}
                    className="pl-3.5 pr-1 py-1.5 font-semibold text-xs transition-all flex items-center rounded-l-xl cursor-pointer"
                  >
                    <span>{rootCat.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(isOpen ? null : rootCat.id);
                    }}
                    className="pr-2.5 pl-1 py-1.5 rounded-r-xl flex items-center justify-center transition-opacity opacity-80 hover:opacity-100 cursor-pointer"
                    title={`Toggle ${rootCat.name} sub-categories`}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Sub-Categories Floating Dropdown Menu with Hover Bridge */}
                <div
                  className={`absolute left-0 top-full pt-1.5 w-56 z-50 transition-all ${
                    isOpen ? 'block' : 'hidden group-hover:block'
                  }`}
                >
                  <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl py-2 animate-in fade-in duration-150">
                    <div className="px-3.5 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {rootCat.name} Sub-Categories
                    </div>
                    <button
                      onClick={() => {
                        handleCategoryClick(rootCat.id);
                        setOpenDropdownId(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                        isRootActive
                          ? 'text-indigo-600 bg-indigo-50/80'
                          : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                      }`}
                    >
                      All {rootCat.name}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {subCategories.map((sub) => {
                      const isSelectedSub = isHomePage && selectedCategory === sub.id;
                      const childSubCats = dbCategories.filter((c) => c.parentId === sub.id);
                      return (
                        <div key={sub.id} className="py-0.5">
                          <button
                            onClick={() => {
                              handleCategoryClick(sub.id);
                              setOpenDropdownId(null);
                            }}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors flex items-center justify-between ${
                              isSelectedSub
                                ? 'text-indigo-600 font-bold bg-indigo-50/80'
                                : 'text-slate-700 font-bold hover:text-indigo-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{sub.name}</span>
                          </button>

                          {childSubCats.length > 0 && (
                            <div className="pl-5 pr-2 py-1 space-y-1 bg-slate-50/60 border-y border-slate-100/60">
                              {childSubCats.map((childSub) => {
                                const isSelectedChild = isHomePage && selectedCategory === childSub.id;
                                return (
                                  <button
                                    key={childSub.id}
                                    onClick={() => {
                                      handleCategoryClick(childSub.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                                      isSelectedChild
                                        ? 'text-indigo-600 font-extrabold bg-indigo-100/80'
                                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                    <span>{childSub.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
