'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Tag, Sparkles, Calendar, Layers, Package, Loader2, AlertCircle } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  title: string;
}

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendorProducts: ProductOption[];
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendorProducts,
}) => {
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>(20);
  const [scope, setScope] = useState<'ALL_PRODUCTS' | 'CATEGORY' | 'SPECIFIC_PRODUCTS'>('ALL_PRODUCTS');
  
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Format current date and date + 7 days for default inputs
  const nowStr = new Date().toISOString().slice(0, 16);
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

  const [startDate, setStartDate] = useState(nowStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch available categories
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => {
          const raw = data?.data ?? data;
          if (Array.isArray(raw)) {
            setCategories(raw.map((c: any) => ({ id: c.id, name: c.name })));
            if (raw.length > 0) setSelectedCategoryId(raw[0].id);
          }
        })
        .catch((err) => console.error('Error fetching categories for offer modal:', err));

      // Reset form
      setTitle('');
      setDiscountType('PERCENTAGE');
      setDiscountValue(20);
      setScope('ALL_PRODUCTS');
      setSelectedProductIds([]);
      setStartDate(new Date().toISOString().slice(0, 16));
      setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide an occasion or offer title (e.g. Diwali Flash Sale).');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setError('Please enter a valid positive discount value.');
      return;
    }
    if (discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please specify both start and end dates.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after the start date.');
      return;
    }
    if (scope === 'SPECIFIC_PRODUCTS' && selectedProductIds.length === 0) {
      setError('Please select at least one product for this offer.');
      return;
    }

    try {
      setLoading(true);
      const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
      const selectedProductTitles = vendorProducts
        .filter((p) => selectedProductIds.includes(p.id))
        .map((p) => p.title);

      const res = await fetch('/api/vendor/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          discountType,
          discountValue: Number(discountValue),
          scope,
          categoryId: scope === 'CATEGORY' ? selectedCategoryId : null,
          categoryName: scope === 'CATEGORY' ? selectedCategoryObj?.name : null,
          productIds: scope === 'SPECIFIC_PRODUCTS' ? selectedProductIds : [],
          productTitles: scope === 'SPECIFIC_PRODUCTS' ? selectedProductTitles : [],
          startDate,
          endDate,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to publish offer');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while creating the offer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-md shadow-indigo-600/25">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Create Special Occasion Offer</h2>
            <p className="text-xs text-slate-500 font-medium">
              Publish promotional discounts for products or categories with custom valid dates
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Occasion Title & Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Occasion / Offer Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Diwali Festival Sale, End of Season Clearance"
            />

            <Select
              label="Applicable Target Scope *"
              options={[
                { value: 'ALL_PRODUCTS', label: 'All Catalog Products' },
                { value: 'CATEGORY', label: 'Specific Product Category' },
                { value: 'SPECIFIC_PRODUCTS', label: 'Selected Individual Products' },
              ]}
              value={scope}
              onChange={(val: any) => setScope(val)}
            />
          </div>

          {/* Conditional Scope Selector */}
          {scope === 'CATEGORY' && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-indigo-950 block">Select Category *</label>
              <Select
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={selectedCategoryId}
                onChange={(val: any) => setSelectedCategoryId(val)}
              />
            </div>
          )}

          {scope === 'SPECIFIC_PRODUCTS' && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-indigo-950 block">
                Select Applicable Products ({selectedProductIds.length} chosen) *
              </label>
              {vendorProducts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No published products found in your catalog.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {vendorProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductSelection(p.id)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="truncate max-w-xs">{p.title}</span>
                        <span className="text-[10px] uppercase font-bold opacity-80">
                          {isSelected ? 'Selected' : '+ Select'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Discount Type *"
              options={[
                { value: 'PERCENTAGE', label: 'Percentage Discount (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount Off ($)' },
              ]}
              value={discountType}
              onChange={(val: any) => setDiscountType(val)}
            />

            <Input
              label={discountType === 'PERCENTAGE' ? 'Discount Percentage (%) *' : 'Discount Amount ($) *'}
              type="number"
              required
              min={1}
              max={discountType === 'PERCENTAGE' ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 15'}
            />
          </div>

          {/* Validity Period: Start & End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <Input
              label="Offer Start Date & Time *"
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              label="Offer End Date & Time *"
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Optional Note */}
          <Input
            label="Promotional Note / Banner Description (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Apply code FESTIVE20 at checkout for instant savings!"
          />

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </span>
              ) : (
                'Publish Offer & Discount'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
