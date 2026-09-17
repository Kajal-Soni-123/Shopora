'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs p-3.5 space-y-3.5 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Product Image Placeholder */}
        <div className="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-slate-200/70" />
        </div>

        {/* Vendor & Rating Pills Placeholder */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="h-4 w-24 bg-slate-200/80 rounded-md animate-pulse" />
          <div className="h-4 w-12 bg-slate-200/80 rounded-md animate-pulse" />
        </div>

        {/* Title Lines Placeholder */}
        <div className="space-y-1.5 pt-1">
          <div className="h-4 w-5/6 bg-slate-200/80 rounded-md animate-pulse" />
          <div className="h-3 w-4/6 bg-slate-100 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Price & Add to Cart Button Placeholder */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="space-y-1">
          <div className="h-3 w-10 bg-slate-100 rounded-md animate-pulse" />
          <div className="h-5 w-16 bg-slate-200/90 rounded-md animate-pulse" />
        </div>

        <div className="h-9 w-24 bg-indigo-100/60 rounded-xl animate-pulse" />
      </div>
    </div>
  );
};

export const OrderCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 animate-pulse">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-slate-200 rounded-md" />
          <div className="h-3 w-24 bg-slate-100 rounded-md" />
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-full" />
      </div>

      {/* Product Items Shimmer */}
      <div className="flex items-center gap-4 py-2">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
          <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-md" />
      </div>

      {/* Bottom Footer Shimmer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="h-4 w-28 bg-slate-100 rounded-md" />
        <div className="h-8 w-24 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
};
