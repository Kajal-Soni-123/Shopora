'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { AdminCategory } from './CategoryFormModal';

interface DeleteCategoryModalProps {
  categoryToDelete: AdminCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  categoryToDelete,
  onClose,
  onSuccess,
}) => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const res = await fetch(`/api/admin/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      setDeleteLoading(false);

      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Failed to delete category.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setDeleteLoading(false);
      setDeleteError(err.message || 'An error occurred while deleting category.');
    }
  };

  return (
    <Modal
      isOpen={!!categoryToDelete}
      onClose={() => {
        if (!deleteLoading) onClose();
      }}
      title="Confirm Category Deletion"
    >
      <div className="space-y-5">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-rose-950">
              Delete Category &quot;{categoryToDelete?.name}&quot;?
            </h4>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              This action will permanently delete this category and all its dynamic form field specifications. Products associated with this category will remain, but category-level form fields will be removed. This action cannot be undone.
            </p>
          </div>
        </div>

        {deleteError && (
          <div className="p-3.5 bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{deleteError}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={onClose}
            disabled={deleteLoading}
            className="text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            type="button"
            isLoading={deleteLoading}
            onClick={handleConfirmDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
          >
            Delete Category
          </Button>
        </div>
      </div>
    </Modal>
  );
};
