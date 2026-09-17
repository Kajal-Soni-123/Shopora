'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Layers, Loader2, Minus, Plus, RefreshCw } from 'lucide-react';
import { VendorProduct } from '@/components/vendor/VendorProductsSection';

interface QuickStockModalProps {
  isOpen: boolean;
  product: VendorProduct | null;
  onClose: () => void;
  onStockUpdated: () => void;
}

export const QuickStockModal: React.FC<QuickStockModalProps> = ({
  isOpen,
  product,
  onClose,
  onStockUpdated,
}) => {
  const [stockVal, setStockVal] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product && isOpen) {
      setStockVal(String(product.stock));
      setError(null);
    }
  }, [product, isOpen]);

  if (!product) return null;

  const currentNum = parseInt(stockVal, 10);
  const isValidNum = !isNaN(currentNum) && currentNum >= 0;

  const handleAdjust = (delta: number) => {
    const nextVal = Math.max(0, (isValidNum ? currentNum : 0) + delta);
    setStockVal(String(nextVal));
    setError(null);
  };

  const handleSetExact = (val: number) => {
    setStockVal(String(val));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNum) {
      setError('Please enter a valid non-negative integer for stock.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: currentNum,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update stock quantity.');
      } else {
        onStockUpdated();
        onClose();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred while updating stock.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Quick Stock Level Adjustment"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product summary header */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{product.title}</h4>
            <p className="text-[11px] text-slate-500">
              Current inventory:{' '}
              <strong className="text-indigo-600 font-extrabold">{product.stock} units</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold">
            {error}
          </div>
        )}

        {/* Counter controls */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 block">
            New Stock Quantity <span className="text-rose-500 font-extrabold">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjust(-1)}
              disabled={loading || (isValidNum && currentNum <= 0)}
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1">
              <Input
                type="number"
                min="0"
                value={stockVal}
                onChange={(e) => {
                  setStockVal(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                icon={<Layers className="w-4 h-4" />}
                className="text-center font-extrabold text-base"
              />
            </div>

            <button
              type="button"
              onClick={() => handleAdjust(1)}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-500 font-semibold">Quick Presets:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAdjust(10)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80"
            >
              +10 units
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(50)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80"
            >
              +50 units
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(100)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80"
            >
              +100 units
            </button>
            <button
              type="button"
              onClick={() => handleSetExact(0)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/80"
            >
              Out of Stock (0)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Updating...
              </span>
            ) : (
              'Update Inventory'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
