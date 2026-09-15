'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, Send, Loader2, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Flyout } from '@/components/common/Flyout';

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

interface ProductReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productImage: string;
  onReviewSubmitted?: () => void;
}

export function ProductReviewsModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  productImage,
  onReviewSubmitted,
}: ProductReviewsModalProps) {
  const { user, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProductReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching product reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && productId) {
      fetchProductReviews();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!comment.trim()) {
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
          productId,
          rating,
          comment: comment.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.message || 'Failed to submit review.');
      } else {
        setSuccessMsg('Thank you! Your review and comment have been posted.');
        setComment('');
        setRating(5);
        fetchProductReviews();
        if (onReviewSubmitted) onReviewSubmitted();
      }
    } catch (err) {
      console.error('Submit review error:', err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <Image src={productImage} alt={productTitle} fill sizes="40px" className="object-cover" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">{productTitle}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1 text-amber-500 font-black">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {avgRating}
              </span>
              <span>•</span>
              <span>{reviews.length} verified reviews</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Write a Review Section */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Share Your Customer Feedback & Rating
          </h4>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-3">
            {/* Star Picker */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-extrabold text-amber-700">
                  {hoverRating || rating} out of 5 stars
                </span>
              </div>
            </div>

            {/* Comment Input */}
            <div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review comment about fit, quality, or performance..."
                className="w-full p-3 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between">
              {!user ? (
                <p className="text-[11px] text-indigo-600 font-semibold">
                  Sign in to post your customer review.
                </p>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">
                  Posting as <strong className="text-slate-800">{user.name}</strong>
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
                Submit Review
              </button>
            </div>
          </form>
        </div>

        {/* List of Existing Reviews */}
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span>Customer Reviews & Comments ({reviews.length})</span>
          </h4>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs font-semibold">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No reviews yet for this product.</p>
              <p className="text-[11px] text-slate-500">Be the first customer to leave a review!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">
                        {r.user.name ? r.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">{r.user.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{r.comment}</p>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {new Date(r.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Flyout>
  );
}
