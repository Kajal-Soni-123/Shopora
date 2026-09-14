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

export default function HomePage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
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
      }
    }

    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = (product: Product) => {
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
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOrderSuccess = (order: Order) => {
    setLatestOrder(order);
    setCartItems([]);
    setIsCheckoutOpen(false);
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

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-indigo-50/80 via-sky-50/50 to-slate-50">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 text-xs font-bold shadow-sm">
              <ShoporaLogo variant="icon" size="sm" />
              Welcome to Shopora Global Marketplace
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Feel the Joy of <span className="text-indigo-600">Real Market Shopping</span> — Right at Your Fingertips
            </h1>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium">
              Stroll through curated merchant aisles, discover authentic technical gear, outerwear & premium acoustic lifestyle goods from top independent creators, and enjoy real-time shopping excitement with instant express delivery.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>Curated Merchant Boutiques</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                <Zap className="w-4 h-4 text-sky-600" />
                <span>Express Direct Shipping</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Verified Authentic Brands</span>
              </div>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Marketplace Catalog</h2>
            <p className="text-xs text-slate-500 font-medium">
              Explore {Array.isArray(products) ? products.length : 0} featured products from boutique seller partners
            </p>
          </div>
        </div>

        {!Array.isArray(products) || products.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
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
