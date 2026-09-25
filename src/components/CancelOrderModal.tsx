'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  subOrderId?: string;
  orderItemId?: string;
  itemTitle?: string;
  onSuccess: () => void;
}

const CANCELLATION_REASONS = [
  { id: 'CHANGED_MIND', label: 'Changed my mind / Need to re-order' },
  { id: 'FOUND_CHEAPER_ELSEWHERE', label: 'Found better price elsewhere' },
  { id: 'ORDERED_BY_MISTAKE', label: 'Ordered by mistake / Duplicate order' },
  { id: 'SHIPPING_TOO_SLOW', label: 'Delivery time is too long' },
  { id: 'OTHER', label: 'Other reason' },
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  orderId,
  subOrderId,
  orderItemId,
  itemTitle,
  onSuccess,
}) => {
  const [reason, setReason] = useState('CHANGED_MIND');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const endpoint = orderItemId
        ? `/api/order-items/${orderItemId}/cancel`
        : `/api/orders/${orderId}/cancel`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subOrderId,
          reason,
          note: customNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process cancellation.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Error processing cancellation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
          <AlertTriangle className="w-5 h-5" />
          <span>Cancel {orderItemId ? 'Product Item' : subOrderId ? 'Sub-Order Package' : 'Entire Order'}</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {itemTitle && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Item to cancel:</span>
            <strong className="block text-slate-900 font-bold truncate mt-0.5">{itemTitle}</strong>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Reason for Cancellation
          </label>
          <div className="space-y-2">
            {CANCELLATION_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  reason === r.id
                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Additional Comments (Optional)
          </label>
          <textarea
            rows={3}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Tell us more about why you are cancelling..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-rose-500 transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Keep Order
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Confirm Cancellation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
