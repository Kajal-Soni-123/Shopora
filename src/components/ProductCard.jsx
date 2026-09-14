import React from 'react';
import { Flame, Heart, ShoppingBag, Vote, Share2, Star, Check } from 'lucide-react';

export default function ProductCard({ 
  product, 
  onLaunchPoll, 
  onAddToCart, 
  onSuggestToRoom,
  onReaction
}) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#FFFFFF', borderColor: '#E2E8F0' }}>
      
      {/* Product Image & Badges */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden', background: '#F1F5F9' }}>
        <img 
          src={product.image} 
          alt={product.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
        
        {/* Suggested By Tag */}
        {product.suggestedBy && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #F472B6',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#DB2777',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <Share2 size={12} /> Suggested by {product.suggestedBy}
          </div>
        )}

        {/* Reaction Overlay Pills */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          gap: '6px'
        }}>
          <button 
            onClick={() => onReaction(product.id, 'fire')}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #E2E8F0',
              color: '#D97706',
              borderRadius: '9999px',
              padding: '4px 9px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            <Flame size={13} /> {product.reactions.fire}
          </button>
          <button 
            onClick={() => onReaction(product.id, 'heart')}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #E2E8F0',
              color: '#DB2777',
              borderRadius: '9999px',
              padding: '4px 9px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            <Heart size={13} /> {product.reactions.heart}
          </button>
        </div>

        {/* Price Tag Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: '#4F46E5',
          color: 'white',
          fontWeight: '800',
          fontSize: '1rem',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontFamily: 'Space Grotesk',
          boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
        }}>
          ${product.price}
        </div>
      </div>

      {/* Content Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {product.category}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#D97706', fontSize: '0.8rem', fontWeight: '700' }}>
              <Star size={13} fill="#D97706" /> {product.rating} <span style={{ color: '#64748B', fontWeight: '500' }}>({product.reviews})</span>
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0F172A', marginBottom: '8px', lineHeight: '1.3' }}>
            {product.name}
          </h3>

          <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.45', marginBottom: '14px' }}>
            {product.description}
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {product.tags.map((t, idx) => (
              <span key={idx} style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontWeight: '600' }}>
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Co-Shop Interactive Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Top row: Poll & Suggest buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button 
              onClick={() => onLaunchPoll(product)}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '8px', fontSize: '0.8rem', borderColor: '#F472B6', color: '#DB2777' }}
            >
              <Vote size={14} /> Buy or Bye?
            </button>
            <button 
              onClick={() => onSuggestToRoom(product)}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}
            >
              <Share2 size={14} /> Suggest Item
            </button>
          </div>

          {/* Bottom row: Add to Shared Cart */}
          <button 
            onClick={() => onAddToCart(product)}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          >
            <ShoppingBag size={16} /> Add to Shared Cart
          </button>
        </div>

      </div>

    </div>
  );
}
