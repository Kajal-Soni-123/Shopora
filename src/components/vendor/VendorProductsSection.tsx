'use client';

import React from 'react';
import Image from 'next/image';
import { Package, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface VendorProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  rating: number;
  reviewsCount: number;
  category: { id: string; name: string };
  createdAt: string;
}

interface VendorProductsSectionProps {
  products: VendorProduct[];
  loadingData: boolean;
  onOpenAddModal: () => void;
}

export const VendorProductsSection: React.FC<VendorProductsSectionProps> = ({
  products,
  loadingData,
  onOpenAddModal,
}) => {
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
              <th className="py-3.5 px-6 text-right">Published</th>
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
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      p.stock > 10
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {p.stock} units
                  </span>
                </td>
                <td className="py-4 px-4 font-semibold text-slate-700">⭐ {p.rating}</td>
                <td className="py-4 px-6 text-right text-slate-500 font-medium">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
