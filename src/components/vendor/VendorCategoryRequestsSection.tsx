'use client';

import React, { useState } from 'react';
import { FolderPlus, CheckCircle2, Clock, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';

export interface VendorCategoryRequest {
  id: string;
  name: string;
  suggestedParentId?: string | null;
  suggestedParentName?: string | null;
  reason?: string | null;
  fields?: Array<{ name: string; label: string; type: string; options?: string[]; required?: boolean }> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string | null;
  createdAt: string;
}

interface VendorCategoryRequestsSectionProps {
  categoryRequests: VendorCategoryRequest[];
  loadingData: boolean;
  onOpenCategoryRequestModal: () => void;
  onDeleteCategoryRequest?: (id: string) => Promise<void>;
}

export const VendorCategoryRequestsSection: React.FC<VendorCategoryRequestsSectionProps> = ({
  categoryRequests,
  loadingData,
  onOpenCategoryRequestModal,
  onDeleteCategoryRequest,
}) => {
  const [requestToDelete, setRequestToDelete] = useState<VendorCategoryRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!requestToDelete || !onDeleteCategoryRequest) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await onDeleteCategoryRequest(requestToDelete.id);
      setRequestToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete category request.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-600" /> My Category Requests ({categoryRequests.length})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Track category request submissions, manage pending requests, and view Super Admin decisions.
          </p>
        </div>

        <button
          onClick={onOpenCategoryRequestModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 shrink-0 self-start sm:self-auto transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          Request New Category
        </button>
      </div>

      {loadingData ? (
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-xs font-semibold">Loading category requests...</p>
        </div>
      ) : categoryRequests.length === 0 ? (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <FolderPlus className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No category requests submitted yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Need a category for your products? Submit a category request to notify the Super Admin team via email.
          </p>
          <button
            onClick={onOpenCategoryRequestModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            Request Category
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Requested Category</th>
                <th className="py-3.5 px-4">Suggested Parent</th>
                <th className="py-3.5 px-4">Justification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Admin Feedback</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <div>{req.name}</div>
                    {req.fields && Array.isArray(req.fields) && req.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {req.fields.map((f, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded text-[10px] font-semibold">
                            {f.label || f.name} {f.required ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-600">
                    {req.suggestedParentName ? (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {req.suggestedParentName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Top-Level Category</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-600 max-w-xs">
                    <p className="truncate" title={req.reason || undefined}>
                      {req.reason || 'No description'}
                    </p>
                  </td>
                  <td className="py-4 px-4 font-extrabold">
                    {req.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                    {req.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Pending Review
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-600 max-w-xs">
                    {req.adminNotes ? (
                      <p className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] font-medium text-slate-700">
                        {req.adminNotes}
                      </p>
                    ) : (
                      <span className="text-slate-400 italic">Awaiting review</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-medium">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {req.status === 'PENDING' ? (
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setRequestToDelete(req);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200/80 transition-colors"
                        title="Delete pending category request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs font-medium italic">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Standardized Reusable Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!requestToDelete}
        onClose={() => setRequestToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category Request"
        itemName={requestToDelete ? `Category Request: "${requestToDelete.name}"` : undefined}
        description="Are you sure you want to delete this category request? Once deleted, the Super Admin will no longer receive or review this request."
        confirmText="Delete Request"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
        error={deleteError}
      />
    </div>
  );
};
