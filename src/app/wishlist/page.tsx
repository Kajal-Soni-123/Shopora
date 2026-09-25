'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { ProductCard } from '@/components/ProductCard';
import { ProductQuickViewModal } from '@/components/ProductQuickViewModal';
import { SuggestToGroupModal } from '@/components/SuggestToGroupModal';
import GroupShoppingBanner from '@/components/GroupShoppingBanner';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { Input } from '@/components/common/Input';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import { Product, CartItem, Order } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import {
  Heart,
  Search,
  Trash2,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Store,
  Zap,
} from 'lucide-react';

export default function WishlistPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const { wishlist, clearWishlist, removeFromWishlist } = useWishlist();
  const { activeSession, addItemToGroup, suggestProduct, setIsChatDrawerOpen } = useGroupShopping();

  // Page layout state
  const [search, setSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [directBuyItem, setDirectBuyItem] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [suggestTargetProduct, setSuggestTargetProduct] = useState<Product | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const handleDirectBuy = (product: Product) => {
    requireAuth(() => {
      setDirectBuyItem({
        product,
        quantity: 1,
      });
      setIsCheckoutOpen(true);
    });
  };

  // Filter items by search
  const filteredWishlist = wishlist.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Total calculated value of wishlist items
  const totalWishlistValue = wishlist.reduce((acc, item) => acc + item.price, 0);

  // Load initial cart from database
  useEffect(() => {
    async function loadCartFromDB() {
      try {
        const res = await fetch('/api/cart');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCartItems(data.data);
        }
      } catch (e) {
        console.error('Failed to load cart from DB:', e);
      }
    }
    loadCartFromDB();

    // Listen for custom cart-updated events
    const handleCartSync = () => loadCartFromDB();
    window.addEventListener('cart-updated', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    return () => {
      window.removeEventListener('cart-updated', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, []);

  const handleAddToCart = (product: Product) => {
    requireAuth(() => {
      if (activeSession) {
        addItemToGroup(product.id, 1, product.attributes);
      }

      setCartItems((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { product, quantity: 1 }];
      });
      setIsCartOpen(true);

      // Persist in DB
      fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1, attributes: product.attributes }),
      }).catch((err) => console.error('Error syncing add cart to DB:', err));
    });
  };

  const handleSuggestToGroup = async (product: Product) => {
    if (!activeSession) {
      setSuggestTargetProduct(product);
      return;
    }
    const success = await suggestProduct(product.id);
    if (success) {
      setIsChatDrawerOpen(true);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    let targetNewQty = 0;
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            targetNewQty = newQty;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );

    fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: targetNewQty }),
    }).catch((err) => console.error('Error syncing update cart to DB:', err));
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error syncing remove cart to DB:', err));
  };

  const handleConfirmClear = () => {
    clearWishlist();
    setIsConfirmClearOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Group Shopping Top Bar Banner */}
      <GroupShoppingBanner />

      {/* Main Shopora Navigation Bar */}
      <Navbar
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        searchQuery=""
        onSearchChange={() => {}}
        selectedCategory="all"
        onCategorySelect={() => {}}
      />

      {/* Sidebar Navigation Drawer */}
      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
      />

      {/* Sub Header Navigation Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs py-3.5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span className="font-bold text-xs text-slate-900">Saved Wishlist</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'} Saved
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Sleek Dark Navy Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-extrabold text-indigo-200 border border-white/10 shadow-xs">
                <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                <span>My Saved Collection</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                My Wishlist
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Curated collection of products you love. Compare features, monitor stock, and seamlessly transfer items to your cart whenever you are ready to checkout.
              </p>
            </div>

            {/* Quick Stats Box */}
            <div className="flex flex-wrap md:flex-col items-start gap-2.5 text-xs font-semibold text-slate-200 shrink-0 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-white">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span className="font-medium text-slate-300">Total Items:</span>
                <span className="font-extrabold text-white">{wishlist.length}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-medium text-slate-300">Collection Value:</span>
                <span className="font-extrabold text-white">{formatCurrency(totalWishlistValue)}</span>
              </div>
            </div>
          </div>

          <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-9xl font-extrabold select-none pointer-events-none">
            <Heart className="w-64 h-64 fill-current text-white/5" />
          </div>
        </div>

        {/* Toolbar & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search your saved items..."
              icon={<Search className="w-4 h-4 text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing <span className="font-extrabold text-slate-900">{filteredWishlist.length}</span> of{' '}
              <span className="font-extrabold text-slate-900">{wishlist.length}</span> saved products
            </span>

            {wishlist.length > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all border border-rose-200/60 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Wishlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredWishlist.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4 max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <Heart className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                {search ? 'No saved items match your search' : 'Your wishlist is currently empty'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {search
                  ? 'Try modifying your search term to find saved products.'
                  : 'Start exploring our merchant marketplace and click the heart icon on any product to save it here.'}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredWishlist.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                onQuickView={setQuickViewProduct}
                onAddToCart={handleAddToCart}
                onSuggestToGroup={handleSuggestToGroup}
                onBuyNow={handleDirectBuy}
              />
            ))}
          </div>
        )}
      </main>

      {/* Standard Marketplace Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-3">
          <ShoporaLogo variant="full" size="sm" subtext="Global Marketplace" />
          <p>© 2026 Shopora Global Marketplace. Authentic products from top boutique creators.</p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onSuggestToGroup={handleSuggestToGroup}
        onBuyNow={handleDirectBuy}
      />

      <SuggestToGroupModal
        isOpen={!!suggestTargetProduct}
        onClose={() => setSuggestTargetProduct(null)}
        product={suggestTargetProduct}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          requireAuth(() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          });
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectBuyItem(null);
        }}
        items={directBuyItem ? [directBuyItem] : cartItems}
        isDirectBuy={!!directBuyItem}
        onOrderSuccess={() => {
          setIsCheckoutOpen(false);
          if (directBuyItem) {
            setDirectBuyItem(null);
          } else {
            setCartItems([]);
          }
        }}
      />

      <ConfirmModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        title="Clear Entire Wishlist"
        description="Are you sure you want to remove all items from your saved wishlist? This action cannot be undone."
        confirmText="Clear Wishlist"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
