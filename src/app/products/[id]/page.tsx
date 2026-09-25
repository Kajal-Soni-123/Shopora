'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  ShieldCheck,
  Warehouse,
  RefreshCw,
  Truck,
  Star,
  Send,
  Loader2,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Check,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Zap,
  Share2,
} from 'lucide-react';
import { Product, CartItem, Order } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { SidebarNav } from '@/components/SidebarNav';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { RatingStars } from '@/components/common/RatingStars';
import { useAuth } from '@/context/AuthContext';
import { getColorStyle } from '@/lib/color-utils';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import GroupShoppingBanner from '@/components/GroupShoppingBanner';
import GroupShoppingModal from '@/components/GroupShoppingModal';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const { user, requireAuth, openAuthModal } = useAuth();
  const {
    activeSession,
    isGroupModalOpen,
    setIsGroupModalOpen,
    addItemToGroup,
    suggestProduct,
    setIsChatDrawerOpen,
  } = useGroupShopping();

  // Page State
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Gallery & Variant Selection State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Review Form State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Layout & Global Drawer States
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [directBuyItem, setDirectBuyItem] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Fetch product data and related products
  useEffect(() => {
    if (!productId) return;

    async function fetchProductDetails() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setProduct(data.data.product);
          setRelatedProducts(data.data.relatedProducts || []);
          setHasPurchased(!!data.data.hasPurchased);
          if (data.data.product?.reviews) {
            setReviews(data.data.product.reviews);
          }
        } else {
          setError(data.message || 'Product not found.');
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product information.');
      } finally {
        setLoading(false);
      }
    }

    fetchProductDetails();
    window.scrollTo(0, 0);
  }, [productId]);

  // Load Categories for Sidebar
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
        console.error('Error fetching categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Cart from DB
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
  }, []);

  const handleAddToCart = (itemToAdd?: Product) => {
    const targetProduct = itemToAdd || product;
    if (!targetProduct) return;

    requireAuth(() => {
      if (activeSession) {
        addItemToGroup(targetProduct.id, 1, selectedVariants);
      }

      setCartItems((prev) => {
        const existing = prev.find((item) => item.product.id === targetProduct.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === targetProduct.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { product: targetProduct, quantity: 1 }];
      });
      setIsCartOpen(true);

      fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: targetProduct.id,
          quantity: 1,
          attributes: selectedVariants,
        }),
      }).catch((err) => console.error('Error syncing add cart to DB:', err));
    });
  };

  const handleSuggestToGroup = async (itemToSuggest?: Product) => {
    const target = itemToSuggest || product;
    if (!target) return;

    if (!activeSession) {
      setIsGroupModalOpen(true);
      return;
    }
    const success = await suggestProduct(target.id);
    if (success) {
      setIsChatDrawerOpen(true);
    }
  };

  const handleBuyNow = (itemToBuy?: Product) => {
    const targetProduct = itemToBuy || product;
    if (!targetProduct) return;

    requireAuth(() => {
      setDirectBuyItem({
        product: {
          ...targetProduct,
          attributes: selectedVariants,
        },
        quantity: 1,
      });
      setIsCheckoutOpen(true);
    });
  };

  const handleUpdateQuantity = (pId: string, delta: number) => {
    let targetNewQty = 0;
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === pId) {
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
      body: JSON.stringify({ productId: pId, quantity: targetNewQty }),
    }).catch((err) => console.error('Error syncing update cart to DB:', err));
  };

  const handleRemoveItem = (pId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== pId));
    fetch(`/api/cart?productId=${encodeURIComponent(pId)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error syncing remove cart to DB:', err));
  };

  const handleOrderSuccess = (order: Order) => {
    setLatestOrder(order);
    setIsCheckoutOpen(false);
    if (directBuyItem) {
      setDirectBuyItem(null);
    } else {
      setCartItems([]);
      fetch('/api/cart?clearAll=true', { method: 'DELETE' }).catch((e) =>
        console.error('Error clearing DB cart after checkout:', e)
      );
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!commentText.trim()) {
      setReviewError('Please write a review comment.');
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError('');
      setReviewSuccess('');

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: userRating,
          comment: commentText.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setReviewError(json.message || 'Failed to submit review.');
      } else {
        setReviewSuccess('Thank you! Your customer review has been published.');
        setCommentText('');
        setUserRating(5);
        // Refresh reviews list
        const revRes = await fetch(`/api/products/${product.id}/reviews`);
        if (revRes.ok) {
          const revJson = await revRes.json();
          setReviews(revJson.data || []);
        }
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError('An unexpected error occurred while submitting.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <GroupShoppingBanner />
        <Navbar
          cartItems={cartItems}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          searchQuery=""
          onSearchChange={() => {}}
          selectedCategory="all"
          onCategorySelect={() => {}}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Product Details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <GroupShoppingBanner />
        <Navbar
          cartItems={cartItems}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          searchQuery=""
          onSearchChange={() => {}}
          selectedCategory="all"
          onCategorySelect={() => {}}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">{error || 'Product Not Found'}</h2>
          <p className="text-xs text-slate-500 mb-4">The item you are looking for may have been removed or updated.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const allImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));
  const currentAvgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : product.rating.toFixed(1);
  const currentReviewCount = reviews.length > 0 ? reviews.length : product.reviewsCount;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <GroupShoppingBanner />

      <Navbar
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        searchQuery=""
        onSearchChange={(q) => router.push(`/?query=${encodeURIComponent(q)}`)}
        selectedCategory="all"
        onCategorySelect={(cat) => router.push(`/?category=${encodeURIComponent(cat)}`)}
        ordersCount={latestOrder ? 1 : 0}
      />

      <SidebarNav
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={categories}
        selectedCategory="all"
        onCategorySelect={(cat) => {
          setIsSidebarOpen(false);
          router.push(`/?category=${encodeURIComponent(cat)}`);
        }}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-10">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            href={`/?category=${encodeURIComponent(product.category?.slug || 'all')}`}
            className="hover:text-indigo-600 transition-colors"
          >
            {product.category?.name || 'Category'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-xs">{product.title}</span>
        </div>

        {/* TOP SECTION: Compact Flipkart/Meesho Style Product Showcase */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column (5 Cols): Product Image Gallery - Exact Height Match with Right Column */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-2.5 max-w-[360px] mx-auto lg:max-w-none w-full">
            <div className="relative flex-1 min-h-[260px] sm:min-h-[300px] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-2xs group flex items-center justify-center">
              <Image
                src={allImages[activeImageIndex] || product.image}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <div className="absolute top-2 left-2 z-10">
                <Badge
                  variant="info"
                  size="sm"
                  className="bg-white/95 backdrop-blur-md text-slate-800 border-slate-200 shadow-2xs font-bold text-[10px] px-2 py-0.5"
                >
                  <Warehouse className="w-3 h-3 mr-1 text-indigo-600" />
                  {product.vendor?.warehouseLocation || 'Central Warehouse'}
                </Badge>
              </div>
            </div>

            {/* Gallery Thumbnails Carousel */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 justify-center sm:justify-start shrink-0 pt-1">
                {allImages.map((imgUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      // Sync with color variant attribute if available
                      if (product.attributes) {
                        const colorEntry = Object.entries(product.attributes).find(([k]) =>
                          k.toLowerCase().includes('color')
                        );
                        if (colorEntry) {
                          const [attrKey, attrVal] = colorEntry;
                          const options = Array.isArray(attrVal)
                            ? attrVal
                            : typeof attrVal === 'string'
                            ? attrVal.split(',').map((s) => s.trim())
                            : [];
                          if (options[idx % options.length]) {
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [attrKey]: options[idx % options.length],
                            }));
                          }
                        }
                      }
                    }}
                    className={`relative w-13 h-16 sm:w-14 sm:h-18 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer bg-slate-50 shadow-2xs ${
                      activeImageIndex === idx
                        ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-105 shadow-md z-10'
                        : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Image src={imgUrl} alt={`Thumbnail ${idx + 1}`} fill sizes="64px" className="object-contain p-0.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column (7 Cols): Product Specifications, Variants & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              {/* Title & Brand Vendor Info */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-0.5">
                  <span className="font-extrabold text-indigo-600 uppercase tracking-wider text-[11px]">
                    {product.vendor?.name || 'Verified Merchant'}
                  </span>
                  <a href="#customer-reviews" className="hover:opacity-80 transition-opacity">
                    <RatingStars rating={Number(currentAvgRating)} reviewsCount={currentReviewCount} size="sm" />
                  </a>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {product.title}
                </h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium line-clamp-2">{product.description}</p>
              </div>

              {/* Price Block */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Inclusive of seller taxes</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                  In Stock & Ready to Dispatch
                </div>
              </div>

              {/* Category Specifications & Variants (Color, Size, etc.) */}
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                    Select Variant & Specifications
                  </span>

                  <div className="space-y-2">
                    {Object.entries(product.attributes).map(([attrKey, attrVal]) => {
                      let optionsArr: string[] = [];
                      if (Array.isArray(attrVal)) {
                        optionsArr = attrVal;
                      } else if (typeof attrVal === 'string') {
                        optionsArr = attrVal.split(',').map((s) => s.trim()).filter(Boolean);
                      }

                      if (optionsArr.length > 0) {
                        const isColorKey = attrKey.toLowerCase().includes('color');
                        const selectedVal = selectedVariants[attrKey] || optionsArr[0];

                        return (
                          <div key={attrKey} className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              {attrKey}: <span className="font-bold text-indigo-600 ml-1">{selectedVal}</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {optionsArr.map((opt, optIdx) => {
                                const isChosen = selectedVal === opt;
                                const colorStyle = isColorKey ? getColorStyle(opt) : null;

                                if (colorStyle) {
                                  const isWhite = opt.toLowerCase() === 'white';
                                  return (
                                    <button
                                      type="button"
                                      key={opt}
                                      title={opt}
                                      onClick={() => {
                                        setSelectedVariants((prev) => ({
                                          ...prev,
                                          [attrKey]: opt,
                                        }));
                                        if (allImages[optIdx]) {
                                          setActiveImageIndex(optIdx % allImages.length);
                                        }
                                      }}
                                      className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center border shadow-2xs cursor-pointer ${
                                        colorStyle.border
                                      } ${
                                        isChosen
                                          ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110 shadow-md z-10'
                                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                                      }`}
                                      style={{ background: colorStyle.background }}
                                    >
                                      {isChosen && (
                                        <Check
                                          className={`w-4 h-4 stroke-[3] ${
                                            isWhite ? 'text-slate-900' : 'text-white'
                                          }`}
                                        />
                                      )}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    key={opt}
                                    onClick={() =>
                                      setSelectedVariants((prev) => ({
                                        ...prev,
                                        [attrKey]: opt,
                                      }))
                                    }
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                      isChosen
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-105'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={attrKey}
                          className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 last:border-none"
                        >
                          <span className="font-bold text-slate-600">{attrKey}:</span>
                          <span className="font-extrabold text-slate-900">{String(attrVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Compact Fulfillment & Trust Bar */}
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between text-[11px] text-purple-900 font-medium">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Fulfilled from <strong className="font-extrabold">{product.vendor?.warehouseLocation || 'Central Warehouse'}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Authentic</span>
                </div>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="pt-3 border-t border-slate-200/80 flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleAddToCart()}
                leftIcon={<ShoppingCart className="w-4 h-4" />}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-indigo-600/20 text-xs sm:text-sm justify-center"
              >
                Add to Cart
              </Button>

              {activeSession ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleSuggestToGroup()}
                  leftIcon={<Sparkles className="w-4 h-4 text-indigo-600" />}
                  className="flex-1 border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold py-2.5 rounded-xl text-xs sm:text-sm justify-center"
                >
                  Suggest to Group
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBuyNow()}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 px-4 rounded-xl shadow-md shadow-amber-500/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Buy Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Customer Reviews & Ratings (Read-Only Verified Buyer Feedback) */}
        <section id="customer-reviews" className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                Customer Ratings & Verified Reviews
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Real customer feedback and verified ratings for {product.title}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{currentAvgRating} out of 5 stars ({currentReviewCount} reviews)</span>
              </div>
            </div>
          </div>

          {/* List of Verified Reviews */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No customer reviews yet</p>
                <p className="text-[11px] text-slate-500">
                  Reviews are verified and submitted by customers after receiving their order.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                          {r.user.name ? r.user.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">{r.user.name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            Verified Buyer
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(r.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                      "{r.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM SECTION: Flipkart / Meesho Style Related & Similar Products Slider/Grid */}
        {relatedProducts.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Flipkart & Meesho Recommendations</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Similar & Related Products You Might Like
                </h3>
              </div>
              <Link
                href={`/?category=${encodeURIComponent(product.category?.slug || 'all')}`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View All in {product.category?.name || 'Category'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Responsive Grid of Wider Related Product Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  product={relProduct}
                  onAddToCart={handleAddToCart}
                  onSuggestToGroup={handleSuggestToGroup}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <p>© 2026 Shopora Global Marketplace. Authentic products from top boutique creators.</p>
        </div>
      </footer>

      {/* Modals & Drawers */}
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
        onOrderSuccess={handleOrderSuccess}
      />

      <GroupShoppingModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
}
