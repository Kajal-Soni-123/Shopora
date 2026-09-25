'use client';

import React, { useState } from 'react';
import { RotateCcw, Upload, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { formatCurrency } from '@/lib/utils';

interface ReturnItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItemId: string;
  itemTitle: string;
  itemPrice: number;
  maxQuantity: number;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  { id: 'DAMAGED', label: 'Item arrived damaged or broken' },
  { id: 'DEFECTIVE', label: 'Defective / Doesn\'t work properly' },
  { id: 'WRONG_PRODUCT', label: 'Received wrong product' },
  { id: 'WRONG_SIZE', label: 'Wrong size or fit' },
  { id: 'NOT_AS_DESCRIBED', label: 'Item not as described / pictured' },
  { id: 'MISSING_PARTS', label: 'Missing accessories or parts' },
  { id: 'CHANGED_MIND', label: 'No longer needed / Changed mind' },
  { id: 'OTHER', label: 'Other issue' },
];

export const ReturnItemModal: React.FC<ReturnItemModalProps> = ({
  isOpen,
  onClose,
  orderItemId,
  itemTitle,
  itemPrice,
  maxQuantity,
  onSuccess,
}) => {
  const [reason, setReason] = useState('DAMAGED');
  const [quantity, setQuantity] = useState(1);
  const [customerNote, setCustomerNote] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const estimatedRefund = Number((itemPrice * quantity).toFixed(2));

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setImages((prev) => [...prev, imageInput.trim()]);
      setImageInput('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/order-items/${orderItemId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          quantity,
          customerNote,
          images,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit return request.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Error submitting return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-base">
          <RotateCcw className="w-5 h-5" />
          <span>Request Return & Refund</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
          <div className="truncate pr-2">
            <span className="text-slate-500 font-medium">Product:</span>
            <strong className="block text-slate-900 font-bold truncate">{itemTitle}</strong>
          </div>
          <div className="text-right shrink-0">
            <span className="text-slate-500 text-[10px] block">Unit Price</span>
            <span className="font-extrabold text-slate-900">{formatCurrency(itemPrice)}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Quantity selector */}
        {maxQuantity > 1 && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity to Return (Max: {maxQuantity})
            </label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
            >
              {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((qty) => (
                <option key={qty} value={qty}>
                  {qty} item(s)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reason selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Reason for Return
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
          >
            {RETURN_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description / Customer Note */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Issue Description / Customer Note
          </label>
          <textarea
            rows={3}
            required
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Please describe the condition or defect in detail..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Evidence Image URL Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Evidence Photos (URLs)</span>
            <span className="text-[10px] text-slate-400">Optional</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
              Add Photo
            </Button>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 w-12 h-12 bg-slate-100 flex items-center justify-center">
                  {/* eslint-disable-next-html-element-suppression */}
                  <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estimated Refund Banner */}
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
          <span className="font-bold text-emerald-900">Estimated Refund Amount:</span>
          <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(estimatedRefund)}</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Submit Return Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
