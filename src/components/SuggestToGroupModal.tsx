'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useGroupShopping } from '@/context/GroupShoppingContext';

interface SuggestToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    price: number;
    image: string;
  } | null;
}

export function SuggestToGroupModal({ isOpen, onClose, product }: SuggestToGroupModalProps) {
  const { suggestProduct, setIsChatDrawerOpen, activeSession, setIsGroupModalOpen } = useGroupShopping();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeSession) {
      setErrorToast('Please start or join a group party first before sharing suggestions.');
      setTimeout(() => {
        onClose();
        setIsGroupModalOpen(true);
      }, 1200);
      return;
    }

    setIsSubmitting(true);
    const result = await suggestProduct(product.id, comment);
    setIsSubmitting(false);

    if (result.success) {
      setComment('');
      setErrorToast(null);
      onClose();
      setIsChatDrawerOpen(true);
    } else {
      setErrorToast(result.error || 'Failed to share product suggestion.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        {/* Error Notification Toast Banner */}
        {errorToast && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{errorToast}</span>
          </div>
        )}
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-lg">✨</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Suggest to Group</h3>
              <p className="text-xs text-slate-500">Share this product with your Co-Shop group</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{product.title}</h4>
            <p className="text-sm font-bold text-indigo-600">${product.price.toFixed(2)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Add a note to your group (optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. What do you think about getting this one?"
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sharing...
                </>
              ) : (
                'Share Suggestion'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
