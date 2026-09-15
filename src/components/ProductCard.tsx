'use client';

import React from 'react';
import Image from 'next/image';
import { Eye, ShoppingCart, Warehouse } from 'lucide-react';
import { Product } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { RatingStars } from '@/components/common/RatingStars';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onQuickView,
  onAddToCart,
}) => {
  return (
    <div className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/60">
      {/* Image & Badges Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Vendor Warehouse Badge */}
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="info" size="sm" className="bg-white/90 backdrop-blur-md text-slate-800 border-slate-200 shadow-sm font-semibold">
            <Warehouse className="w-3 h-3 mr-1 text-indigo-600" />
            {product.vendor?.warehouseLocation || 'Central Warehouse'}
          </Badge>
        </div>

        {/* Quick View & Add to Cart Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2.5 p-4 z-20">
          <button
            onClick={() => onQuickView(product)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-md shadow-slate-900/10 transition-all active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Quick View</span>
          </button>
          <button
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer border border-indigo-500/40"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-slate-500 font-semibold">{product.vendor?.name || 'Vendor Partner'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              title="View customer reviews & rating breakdown"
              className="hover:opacity-80 transition-opacity"
            >
              <RatingStars rating={product.rating} reviewsCount={product.reviewsCount} size="sm" />
            </button>
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {product.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        {/* Sub-Order Splitting Info & Price */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Fulfilled by Sub-Order</span>
            <span className="text-lg font-extrabold text-slate-900">{formatCurrency(product.price)}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToCart(product)}
            leftIcon={<ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-semibold"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
