'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, X, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { formatCurrency } from '@/lib/utils';

export function WishlistDrawer() {
  const { wishlist, isWishlistOpen, setIsWishlistOpen, removeFromWishlist, clearWishlist } = useWishlist();
  const [movingProductId, setMovingProductId] = useState<string | null>(null);

  if (!isWishlistOpen) return null;

  const handleMoveToCart = async (product: any) => {
    setMovingProductId(product.id);
    try {
      // Sync with database cart API
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          attributes: product.attributes || {},
        }),
      });

      // Dispatch event to notify Navbar / Cart Drawer of update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error('Failed to sync item to cart API:', e);
    } finally {
      setMovingProductId(null);
      // Remove from wishlist after moving
      removeFromWishlist(product.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white text-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
          {/* Standard Light Flyout Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Saved Wishlist</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {wishlist.length} {wishlist.length === 1 ? 'product' : 'products'} saved
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWishlistOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Product List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Heart className="w-8 h-8 text-indigo-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Your Wishlist is Empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs font-medium leading-relaxed">
                    Save items you love by tapping the heart icon on any product card while browsing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWishlistOpen(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              wishlist.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex gap-3.5 items-center group"
                >
                  {/* Image Thumbnail */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/90">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-indigo-600 transition-colors" title={product.title}>
                      {product.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {formatCurrency(product.price)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-tight ${
                          product.stock > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}
                      >
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(product)}
                      disabled={product.stock <= 0 || movingProductId === product.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{movingProductId === product.id ? 'Adding...' : 'Add to Cart'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {wishlist.length > 0 && (
            <div className="p-4 bg-white border-t border-slate-200/80 space-y-2">
              <Link
                href="/wishlist"
                onClick={() => setIsWishlistOpen(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <span>View Full Wishlist Page</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
              <button
                type="button"
                onClick={clearWishlist}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-rose-600 py-1 transition-colors cursor-pointer"
              >
                Clear All Items
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
