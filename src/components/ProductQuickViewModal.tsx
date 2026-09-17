'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, ShieldCheck, Warehouse, RefreshCw, Truck, Star, Send, Loader2, MessageSquare, AlertCircle, CheckCircle2, Check } from 'lucide-react';
import { Product } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { RatingStars } from '@/components/common/RatingStars';
import { useAuth } from '@/context/AuthContext';
import { getColorStyle } from '@/lib/color-utils';

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

interface ProductQuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = React.memo(({
  product,
  onClose,
  onAddToCart,
}) => {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Gallery & Variant Selection State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Review Form State
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReviews = async (productId: string) => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (product) {
      setActiveTab('details');
      setErrorMsg('');
      setSuccessMsg('');
      setCommentText('');
      setUserRating(5);
      setActiveImageIndex(0);
      setSelectedVariants({});
      fetchReviews(product.id);
    }
  }, [product]);

  if (!product) return null;

  const allImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!commentText.trim()) {
      setErrorMsg('Please write a review comment.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

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
        setErrorMsg(json.message || 'Failed to submit review.');
      } else {
        setSuccessMsg('Thank you! Your customer review and comment have been posted.');
        setCommentText('');
        setUserRating(5);
        fetchReviews(product.id);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setErrorMsg('An unexpected error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentAvgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : product.rating.toFixed(1);

  const currentReviewCount = reviews.length > 0 ? reviews.length : product.reviewsCount;

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('details')}
            className={`text-xs sm:text-sm font-extrabold pb-1 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Product Details & Specs
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`text-xs sm:text-sm font-extrabold pb-1 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            Customer Reviews & Comments ({currentReviewCount})
          </button>
        </div>

        {/* Tab 1: Product Overview */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Image & Gallery Side */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src={allImages[activeImageIndex] || product.image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-all duration-300"
                />
                <div className="absolute bottom-4 left-4 z-10">
                  <Badge variant="info" size="sm" className="bg-white/90 backdrop-blur-md text-slate-800 border-slate-200 shadow-sm font-semibold">
                    <Warehouse className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    {product.vendor?.warehouseLocation || 'Central Warehouse'}
                  </Badge>
                </div>
              </div>

              {/* Gallery Thumbnails List */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        activeImageIndex === idx
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-105'
                          : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image src={imgUrl} alt={`Thumbnail ${idx + 1}`} fill sizes="56px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details & Variant Selection Side */}
            <div className="flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-bold text-indigo-600">{product.vendor?.name || 'Vendor Partner'}</span>
                    <button onClick={() => setActiveTab('reviews')} className="hover:opacity-80 transition-opacity">
                      <RatingStars rating={Number(currentAvgRating)} reviewsCount={currentReviewCount} size="sm" />
                    </button>
                  </div>

                  <h2 className="text-xl font-extrabold text-slate-900 mb-2">{product.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{product.description}</p>
                </div>

                {/* Category Specifications & Variants (Size, Color, etc.) */}
                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                      Select Variant & Specifications
                    </span>

                    <div className="space-y-3">
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
                            <div key={attrKey} className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 block">
                                {attrKey}: <span className="font-semibold text-indigo-600 ml-1">{selectedVal}</span>
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {optionsArr.map((opt) => {
                                  const isChosen = selectedVal === opt;
                                  const colorStyle = isColorKey ? getColorStyle(opt) : null;

                                  if (colorStyle) {
                                    const isWhite = opt.toLowerCase() === 'white';
                                    return (
                                      <button
                                        type="button"
                                        key={opt}
                                        title={opt}
                                        onClick={() =>
                                          setSelectedVariants((prev) => ({
                                            ...prev,
                                            [attrKey]: opt,
                                          }))
                                        }
                                        className={`relative w-8 h-8 rounded-full transition-all flex items-center justify-center border shadow-sm ${
                                          colorStyle.border
                                        } ${
                                          isChosen
                                            ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110'
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
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                        isChosen
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-105'
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
                          <div key={attrKey} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-none">
                            <span className="font-bold text-slate-600">{attrKey}:</span>
                            <span className="font-extrabold text-slate-900">{String(attrVal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Order Split Callout */}
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                    <Truck className="w-4 h-4 text-purple-600" />
                    <span>Independent Sub-Order Fulfillment</span>
                  </div>
                  <p className="text-[11px] text-purple-800 mt-1 font-medium">
                    This item will be fulfilled as a separate sub-order directly from{' '}
                    <span className="font-bold text-purple-900">{product.vendor?.warehouseLocation || 'Warehouse'}</span>.
                  </p>
                </div>

                {/* Guarantees */}
                <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3 font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>100% Authentic Guarantee & Vendor Warranty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    <span>Free 30-Day Sub-Order Return Policy</span>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Unit Price</span>
                  <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(product.price)}</span>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onAddToCart({
                      ...product,
                      attributes: {
                        ...(product.attributes as object),
                        ...selectedVariants,
                      },
                    });
                    onClose();
                  }}
                  leftIcon={<ShoppingCart className="w-4 h-4" />}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25"
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Customer Reviews & Submission Form */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Header summary banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-3xl font-black text-slate-900 block">{currentAvgRating}</span>
                  <div className="flex items-center gap-0.5 text-amber-400 justify-center sm:justify-start">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(Number(currentAvgRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Overall Customer Feedback</h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Based on {currentReviewCount} verified customer comments & ratings
                  </p>
                </div>
              </div>
            </div>

            {/* Review Submission Form */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Write a Review for {product.title}
              </h4>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-3">
                {/* Star Picker */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Select Star Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || userRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-extrabold text-amber-800">
                      {hoverRating || userRating} out of 5 stars
                    </span>
                  </div>
                </div>

                {/* Comment Input */}
                <div>
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write your experience with this item (quality, sizing, shipping...)..."
                    className="w-full p-3 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {!user ? (
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Sign in to submit your review
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      Posting review as <strong className="text-slate-800">{user.name}</strong>
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Submit Customer Review
                  </button>
                </div>
              </form>
            </div>

            {/* List of Verified Reviews */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Customer Comments & Ratings ({reviews.length})
              </h4>

              {loadingReviews ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs font-semibold">Loading product reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No customer reviews yet</p>
                  <p className="text-[11px] text-slate-500">Be the first customer to leave feedback above!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 px-5">
                  {reviews.map((r) => (
                    <div key={r.id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                            {r.user.name ? r.user.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">{r.user.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Verified Buyer</span>
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
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(r.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        "{r.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

ProductQuickViewModal.displayName = 'ProductQuickViewModal';

