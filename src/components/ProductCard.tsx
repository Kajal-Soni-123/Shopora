import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Warehouse, Sparkles, Check, Heart, ArrowRight, Zap } from 'lucide-react';
import { Product } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { RatingStars } from '@/components/common/RatingStars';
import { getColorStyle } from '@/lib/color-utils';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import { useWishlist } from '@/context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onSuggestToGroup?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onQuickView,
  onAddToCart,
  onSuggestToGroup,
  onBuyNow,
}) => {
  const [justAdded, setJustAdded] = useState(false);
  const router = useRouter();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const {
    activeSession,
    activeMember,
    memberPresences,
    updateMyPresence,
    isItemInGroupCart,
  } = useGroupShopping();

  const cardRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);

  const inGroupCart = activeSession ? isItemInGroupCart(product.id) : false;

  // Other active party members hovering over this specific product card
  const otherHoverers = (memberPresences || []).filter(
    (p) => p.hoveredProductId === product.id && p.memberId !== activeMember?.id
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeSession || !activeMember || !cardRef.current) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 80) return;
    lastUpdateRef.current = now;

    const rect = cardRef.current.getBoundingClientRect();
    const cursorX = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const cursorY = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    updateMyPresence(product.id, cursorX, cursorY, true);
  };

  const handleMouseLeave = () => {
    if (!activeSession || !activeMember) return;
    updateMyPresence(null, 0, 0, false);
  };

  const handleCardClick = () => {
    router.push(`/products/${product.id}`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      className="group relative bg-white border border-slate-200/70 rounded-2xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between hover:shadow-md cursor-pointer"
    >
      {/* Live Multiplayer Member Hover Badge Overlay */}
      {otherHoverers.length > 0 && (
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border border-indigo-400/80 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span>
            {otherHoverers[0].memberName} {otherHoverers.length > 1 ? `+${otherHoverers.length - 1}` : ''} browsing
          </span>
        </div>
      )}

      {/* Live Pointer Cursors of other Group Members */}
      {otherHoverers.map((p) => (
        <div
          key={p.memberId}
          className="absolute z-30 pointer-events-none transition-all duration-200 ease-out transform -translate-x-1 -translate-y-1"
          style={{ left: `${p.cursorX ?? 50}%`, top: `${p.cursorY ?? 50}%` }}
        >
          <svg className="w-5 h-5 text-indigo-600 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
          <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg ml-3 -mt-2 whitespace-nowrap border border-indigo-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{p.memberName}</span>
          </div>
        </div>
      ))}

      {/* Image & Badges Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50 rounded-t-2xl">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Vendor Location Badge */}
        {product.vendor?.warehouseLocation && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200/80 shadow-2xs">
              <Warehouse className="w-3 h-3 mr-1 text-slate-500" />
              {product.vendor.warehouseLocation}
            </span>
          </div>
        )}

        {/* Wishlist Heart Toggle Button */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product as any);
            }}
            className={`p-2 rounded-full backdrop-blur-md shadow-md transition-all cursor-pointer ${
              isInWishlist(product.id)
                ? 'bg-rose-500 text-white scale-110'
                : 'bg-white/80 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
            title={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                isInWishlist(product.id) ? 'fill-current scale-110' : ''
              }`}
            />
          </button>
        </div>

        {/* View Details Hover Overlay */}
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center p-4 z-10">
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-white text-slate-900 shadow-md">
            <span>View Product Details</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-3.5">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="text-slate-500 font-semibold truncate max-w-[60%]">
              Sold by {product.vendor?.name || 'Shopora Partner'}
            </span>
            <div title="Customer reviews">
              <RatingStars rating={product.rating} reviewsCount={product.reviewsCount} size="sm" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
            {product.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium leading-relaxed">
            {product.description}
          </p>

          {/* Color Variant Preview Swatches */}
          {(() => {
            const colorAttribute = product.attributes
              ? Object.entries(product.attributes).find(([k]) => k.toLowerCase().includes('color'))
              : null;
            const colorList: string[] = colorAttribute
              ? Array.isArray(colorAttribute[1])
                ? colorAttribute[1]
                : [String(colorAttribute[1])]
              : [];

            if (colorList.length === 0) return null;

            return (
              <div className="flex items-center gap-1.5 pt-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Colors:</span>
                <div className="flex items-center gap-1">
                  {colorList.slice(0, 5).map((colorName, i) => {
                    const colorStyle = getColorStyle(colorName);
                    return (
                      <span
                        key={i}
                        title={colorName}
                        className={`w-3.5 h-3.5 rounded-full border ${colorStyle.border} shadow-2xs transition-transform hover:scale-125 cursor-pointer`}
                        style={{ background: colorStyle.background }}
                      />
                    );
                  })}
                  {colorList.length > 5 && (
                    <span className="text-[9px] font-bold text-slate-400">+{colorList.length - 5}</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Price & Add Action */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col gap-3 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-slate-900 leading-none">{formatCurrency(product.price)}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full">
            {activeSession && onSuggestToGroup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuggestToGroup(product);
                }}
                title="Share this product to group chat for team discussion & voting"
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Suggest</span>
              </button>
            )}

            {inGroupCart ? (
              <span className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                In Cart
              </span>
            ) : justAdded ? (
              <span className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-emerald-600 text-white flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/30 animate-in zoom-in-95 duration-150">
                <Check className="w-4 h-4 text-white shrink-0" />
                <span>Added!</span>
              </span>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddToCart) onAddToCart(product);
                    setJustAdded(true);
                    setTimeout(() => setJustAdded(false), 1800);
                  }}
                  leftIcon={<ShoppingCart className="w-4 h-4" />}
                  className="flex-1 font-bold rounded-xl px-3 py-2.5 text-xs justify-center whitespace-nowrap shadow-md shadow-indigo-600/20"
                  title={activeSession ? "Add this product to the shared group shopping cart" : "Add to personal cart"}
                >
                  Add to Cart
                </Button>
                {onBuyNow && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuyNow(product);
                    }}
                    title="Direct Buy this item without modifying cart"
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold transition-colors text-xs flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>Buy Now</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
