import React, { useState } from 'react';
import { X, Star, ShoppingBag, Heart, ShieldCheck, Truck, RefreshCw, Check } from 'lucide-react';

export default function ProductQuickViewModal({ product, onClose, onAddToCart, isWishlisted, onToggleWishlist }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart({ ...product, size: selectedSize });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.8)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '660px',
        padding: '20px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '20px' }}>
          
          {/* Image Gallery Preview */}
          <div style={{ borderRadius: '14px', overflow: 'hidden', height: '240px', background: '#0F172A', position: 'relative' }}>
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(16, 185, 129, 0.9)', color: 'white', fontSize: '0.75rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
              IN STOCK
            </div>
          </div>

          {/* Product Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6366F1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {product.category}
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F8FAFC', marginBottom: '8px', lineHeight: '1.2' }}>
                {product.name}
              </h2>

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', color: '#F59E0B' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill={i < Math.floor(product.rating) ? "#F59E0B" : "none"} color="#F59E0B" />
                  ))}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#F8FAFC' }}>{product.rating}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({product.reviews} reviews)</span>
              </div>

              {/* Price */}
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#EC4899', fontFamily: 'Space Grotesk', marginBottom: '12px' }}>
                ${product.price}
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: '1.5', marginBottom: '16px' }}>
                {product.description}
              </p>

              {/* Size Selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#CBD5E1', marginBottom: '8px' }}>Select Size:</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: selectedSize === size ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                        background: selectedSize === size ? 'rgba(99, 102, 241, 0.3)' : 'rgba(15, 23, 42, 0.6)',
                        color: selectedSize === size ? '#fff' : '#94A3B8',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                  onClick={handleAdd}
                  className="btn-primary"
                  style={{ flexGrow: 1, justifyContent: 'center', padding: '12px' }}
                >
                  {added ? <><Check size={18} /> Added to Cart!</> : <><ShoppingBag size={18} /> Add to Cart</>}
                </button>
                <button
                  onClick={() => onToggleWishlist(product.id)}
                  className="btn-secondary"
                  style={{ padding: '12px', borderColor: isWishlisted ? '#EC4899' : undefined }}
                >
                  <Heart size={18} color={isWishlisted ? "#EC4899" : "#94A3B8"} fill={isWishlisted ? "#EC4899" : "none"} />
                </button>
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14} color="#10B981" /> Express Shipping</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} color="#6366F1" /> 2-Yr Warranty</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={14} color="#F59E0B" /> 30-Day Returns</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
