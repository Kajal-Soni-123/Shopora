'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Package, Loader2, Pencil, Trash2, Layers } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { EditProductModal } from '@/components/vendor/EditProductModal';
import { QuickStockModal } from '@/components/vendor/QuickStockModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';

export interface VendorProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images?: string[];
  attributes?: Record<string, any>;
  categoryId?: string;
  rating: number;
  reviewsCount: number;
  category: { id: string; name: string };
  createdAt: string;
}

interface VendorProductsSectionProps {
  products: VendorProduct[];
  loadingData: boolean;
  onOpenAddModal: () => void;
  onProductUpdated?: () => void;
}

export const VendorProductsSection: React.FC<VendorProductsSectionProps> = ({
  products,
  loadingData,
  onOpenAddModal,
  onProductUpdated,
}) => {
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [stockProduct, setStockProduct] = useState<VendorProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<VendorProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/vendor/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Failed to delete product.');
      } else {
        setDeletingProduct(null);
        if (onProductUpdated) {
          onProductUpdated();
        }
      }
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred while deleting product.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs font-semibold">Loading catalog products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center text-slate-500 space-y-3">
        <Package className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">No products published yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
          Click the &quot;Publish Product&quot; button to add your first boutique product to the marketplace.
        </p>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
        >
          Publish Product
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Product</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Price</th>
              <th className="py-3.5 px-4">Stock</th>
              <th className="py-3.5 px-4">Rating</th>
              <th className="py-3.5 px-4">Published</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                      <Image src={p.image} alt={p.title} fill sizes="48px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.title}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{p.description}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 font-semibold text-indigo-600">
                  {p.category?.name || 'General'}
                </td>
                <td className="py-4 px-4 font-extrabold text-slate-900">
                  {formatCurrency(p.price)}
                </td>
                <td className="py-4 px-4 font-bold text-slate-700">
                  <button
                    onClick={() => setStockProduct(p)}
                    title="Click to quickly adjust stock level"
                    className={`group px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                      p.stock > 10
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : p.stock > 0
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span>{p.stock} units</span>
                    <Layers className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                </td>
                <td className="py-4 px-4 font-semibold text-slate-700">⭐ {p.rating}</td>
                <td className="py-4 px-4 text-slate-500 font-medium">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setStockProduct(p)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all border border-slate-200/80"
                      title="Quick Adjust Stock"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all border border-indigo-200/80"
                      title="Edit Product Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingProduct(p);
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-all border border-rose-200/80"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Product Modal (Flyout) */}
      <EditProductModal
        isOpen={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onProductUpdated={() => {
          setEditingProduct(null);
          if (onProductUpdated) onProductUpdated();
        }}
      />

      {/* Quick Stock Modal */}
      <QuickStockModal
        isOpen={!!stockProduct}
        product={stockProduct}
        onClose={() => setStockProduct(null)}
        onStockUpdated={() => {
          setStockProduct(null);
          if (onProductUpdated) onProductUpdated();
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        itemName={deletingProduct ? `Product: "${deletingProduct.title}"` : undefined}
        description="Are you sure you want to delete this product from your published catalog? This action cannot be undone."
        confirmText="Delete Product"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
        error={deleteError}
      />
    </div>
  );
};
