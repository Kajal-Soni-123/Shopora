'use client';

import React, { useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle, PackageCheck, DollarSign, AlertCircle, Clock, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/common/Button';

export interface VendorReturnRequestData {
  id: string;
  orderItemId: string;
  status: string;
  reason: string;
  quantity: number;
  refundAmount: number;
  customerNote?: string;
  vendorNote?: string;
  images?: string[];
  reverseAwb?: string;
  createdAt: string;
  orderItem: {
    price: number;
    quantity: number;
    product: {
      title: string;
      image?: string;
    };
  };
  subOrder: {
    subOrderNumber: string;
    customerName?: string;
  };
}

interface VendorReturnCardProps {
  returnRequest: VendorReturnRequestData;
  onRefresh: () => void;
}

export const VendorReturnCard: React.FC<VendorReturnCardProps> = ({ returnRequest, onRefresh }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject' | 'receive' | 'refund') => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/vendor/returns/${returnRequest.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorNote: action === 'reject' ? rejectReason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Failed to ${action} return request.`);
        setIsSubmitting(false);
        return;
      }

      onRefresh();
    } catch (err: any) {
      setErrorMsg(`Error performing ${action} action.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = () => {
    switch (returnRequest.status) {
      case 'RETURN_REQUESTED':
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Under Review</span>;
      case 'APPROVED':
      case 'PICKUP_SCHEDULED':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"><Truck className="w-3 h-3" /> Approved / In Transit</span>;
      case 'RECEIVED':
      case 'REFUND_PROCESSING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Package Received</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Refunded</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">{returnRequest.status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Sub-Order: {returnRequest.subOrder?.subOrderNumber}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Requested {new Date(returnRequest.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">{returnRequest.orderItem?.product?.title}</h4>
        </div>
        {statusBadge()}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
        <div>
          <span className="text-slate-400 block text-[10px] font-bold uppercase">Return Reason</span>
          <strong className="text-slate-800 font-bold">{returnRequest.reason}</strong>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-bold uppercase">Return Quantity</span>
          <strong className="text-slate-800 font-bold">{returnRequest.quantity} unit(s)</strong>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] font-bold uppercase">Calculated Refund</span>
          <strong className="text-emerald-600 font-black text-sm">{formatCurrency(returnRequest.refundAmount)}</strong>
        </div>
      </div>

      {/* Customer Note */}
      {returnRequest.customerNote && (
        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
          <span className="font-bold text-purple-900 block mb-0.5">Customer Note:</span>
          <p className="text-purple-950 font-medium">{returnRequest.customerNote}</p>
        </div>
      )}

      {/* Reverse AWB if generated */}
      {returnRequest.reverseAwb && (
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs flex justify-between items-center font-mono">
          <span className="text-indigo-800 font-medium">Reverse Pickup AWB:</span>
          <strong className="text-indigo-900 font-bold">{returnRequest.reverseAwb}</strong>
        </div>
      )}

      {/* Action Buttons based on status */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
        {returnRequest.status === 'RETURN_REQUESTED' && (
          <>
            {showRejectInput ? (
              <div className="flex items-center gap-2 w-full pt-1">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={isSubmitting}
                  onClick={() => handleAction('reject')}
                >
                  Confirm Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectInput(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectInput(true)}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold"
                >
                  Reject Request
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  onClick={() => handleAction('approve')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Approve & Schedule Pickup
                </Button>
              </>
            )}
          </>
        )}

        {['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(returnRequest.status) && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isSubmitting}
            onClick={() => handleAction('receive')}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
          >
            Mark Package Received at Warehouse
          </Button>
        )}

        {['RECEIVED', 'REFUND_PROCESSING'].includes(returnRequest.status) && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={() => handleAction('refund')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            Issue & Process Refund ({formatCurrency(returnRequest.refundAmount)})
          </Button>
        )}
      </div>
    </div>
  );
};
