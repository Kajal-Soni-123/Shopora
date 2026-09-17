'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { ProductCard } from '@/components/ProductCard';
import { ProductQuickViewModal } from '@/components/ProductQuickViewModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Product, CartItem, Order, INITIAL_PRODUCTS } from '@/lib/data';
import { Sparkles, ShoppingBag, ShieldCheck, ArrowRight, CheckCircle, Store, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { useAuth } from '@/context/AuthContext';
import { ProductCardSkeleton } from '@/components/common/Skeleton';

export default function HomePage() {
  const router = useRouter();
  const { requireAuth } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);

  // Sync category and search query from URL search params if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category');
      const q = params.get('query');
      if (cat) {
        setSelectedCategory(cat);
      } else {
        setSelectedCategory('all');
      }
      if (q !== null) {
        setSearchQuery(q);
      }
    }
  }, []);

  // Fetch dynamic categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setCategories(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching sidebar categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products from API when category or search query changes
  useEffect(() => {
    async function fetchProducts() {
      setIsLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('query', searchQuery);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          // Support standardized ApiResponse envelope (result.data) or direct array fallback
          const productsList = Array.isArray(result)
            ? result
            : Array.isArray(result.data)
              ? result.data
              : Array.isArray(result.products)
                ? result.products
                : [];
          setProducts(productsList);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchProducts();

    // Fetch initial user cart from database
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
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = (product: Product) => {
    requireAuth(() => {
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

    // Persist update in DB
    fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: targetNewQty }),
    }).catch((err) => console.error('Error syncing update cart to DB:', err));
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));

    // Persist remove in DB
    fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error syncing remove cart to DB:', err));
  };

  const handleOrderSuccess = (order: Order) => {
    setLatestOrder(order);
    setCartItems([]);
    setIsCheckoutOpen(false);

    // Clear cart in DB
    fetch('/api/cart?clearAll=true', { method: 'DELETE' }).catch((e) =>
      console.error('Error clearing DB cart after checkout:', e)
    );

    if (typeof window !== 'undefined') {
      localStorage.setItem('latest_shopora_order', JSON.stringify(order));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navigation Bar */}
      <Navbar
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        ordersCount={latestOrder ? 1 : 0}
      />

      {/* Sidebar Navigation Drawer */}
      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
      />

      {/* Hero Header Banner - Compact & High Efficiency */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-slate-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            {/* <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
              <ShoporaLogo variant="icon" size="sm" />
              <span>Welcome to Shopora Global Marketplace</span>
            </div> */}

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
              Feel the Joy of <span className="text-indigo-600">Real Market Shopping</span> — Right at Your Fingertips
            </h1>

            <p className="text-xs text-slate-600 font-medium max-w-2xl line-clamp-1 sm:line-clamp-2">
              Stroll through curated merchant aisles, discover authentic technical gear, outerwear & premium acoustic lifestyle goods from top independent creators.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col items-start gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs">
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px]">Curated Merchant Boutiques</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[11px]">Express Direct Shipping</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px]">100% Verified Authentic Brands</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Placed Success Callout Banner */}
      {latestOrder && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Order #${latestOrder.orderNumber} Placed Successfully!
                </h3>
                <p className="text-xs text-slate-600">
                  Your package is being prepared by our verified merchants.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/orders/${latestOrder.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap"
            >
              View Order & Tracking
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Catalog Grid */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : !Array.isArray(products) || products.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm">
            <p className="text-sm text-slate-500 font-semibold">No products found matching your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs text-indigo-600 underline font-semibold"
            >
              Reset search and category filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuickViewProduct}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
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
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
}
