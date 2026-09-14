import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, SlidersHorizontal, Sparkles, Users, Zap, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';

export const CATEGORIES = ['All', 'Outerwear', 'Footwear', 'Accessories', 'Audio', 'Bags'];

function HeaderUserControl() {
  const { user, openAuthModal, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal('login')}
        className="btn-secondary"
        style={{ padding: '10px 14px', gap: '6px' }}
      >
        <LogIn size={16} color="#4F46E5" />
        <span style={{ fontSize: '0.85rem' }}>Sign In</span>
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        style={{ padding: '6px 12px', gap: '8px' }}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #4F46E5, #0284C7)',
          color: '#fff',
          fontWeight: '700',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: '0.85rem' }}>{user.name}</span>
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="glass-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: '180px',
            padding: '12px',
            borderRadius: '12px',
            zIndex: 110,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#FFFFFF',
            borderColor: '#E2E8F0'
          }}
        >
          <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
            <p style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0F172A' }}>{user.name}</p>
            <p style={{ fontSize: '0.7rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#E11D48',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textAlign: 'left',
              padding: '4px 0'
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function StandardHeader({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  wishlistCount,
  cartCount,
  setIsCartOpen,
  mode,
  setMode
}) {
  return (
    <header className="glass-panel" style={{ position: 'sticky', top: '12px', zIndex: 100, margin: '12px 16px 20px', padding: '16px 24px', background: 'rgba(255, 255, 255, 0.9)', borderColor: '#E2E8F0' }}>
      
      {/* Top Bar: Brand, Search & Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        
        {/* Brand Logo */}
        <ShoporaLogo variant="full" size="md" subtext="Store" />

        {/* Live Search Input */}
        <div style={{ flexGrow: 1, maxWidth: '440px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search products by name, tag, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input"
            style={{ width: '100%', paddingLeft: '42px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Action Buttons: Wishlist, Cart & Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* User Auth Control */}
          <HeaderUserControl />
          
          {/* Wishlist Button */}
          <button
            title="Wishlist"
            className="btn-secondary"
            style={{ position: 'relative', padding: '10px 14px' }}
          >
            <Heart size={18} color="#E11D48" />
            <span style={{ fontSize: '0.85rem' }}>Wishlist</span>
            {wishlistCount > 0 && (
              <span style={{ background: '#E11D48', color: '#fff', fontSize: '0.7rem', fontWeight: '800', padding: '1px 6px', borderRadius: '9999px' }}>
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="btn-primary"
            style={{ position: 'relative', padding: '10px 16px' }}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{ background: '#fff', color: '#4F46E5', fontSize: '0.75rem', fontWeight: '800', padding: '1px 7px', borderRadius: '9999px' }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* Co-Shop Mode Switcher Toggle */}
          <button
            onClick={() => setMode(mode === 'standard' ? 'coshop' : 'standard')}
            className={mode === 'coshop' ? 'btn-pink' : 'btn-secondary'}
            style={{
              borderColor: mode === 'coshop' ? '#EC4899' : '#CBD5E1',
              boxShadow: mode === 'coshop' ? '0 4px 16px rgba(236,72,153,0.2)' : 'none'
            }}
          >
            <Users size={16} />
            <span>{mode === 'coshop' ? '👥 Co-Shop Mode ON' : '🚀 Try Co-Shop Room'}</span>
          </button>

        </div>

      </div>

      {/* Bottom Filter & Sorting Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', pt: '10px', borderTop: '1px solid #F1F5F9' }}>
        
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: selectedCategory === cat ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                background: selectedCategory === cat ? '#4F46E5' : '#F1F5F9',
                color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                fontSize: '0.825rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={14} color="#64748B" />
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="glass-input"
            style={{ padding: '6px 12px', fontSize: '0.825rem', cursor: 'pointer' }}
          >
            <option value="featured" style={{ background: '#FFFFFF', color: '#0F172A' }}>Featured</option>
            <option value="price-low" style={{ background: '#FFFFFF', color: '#0F172A' }}>Price: Low to High</option>
            <option value="price-high" style={{ background: '#FFFFFF', color: '#0F172A' }}>Price: High to Low</option>
            <option value="rating" style={{ background: '#FFFFFF', color: '#0F172A' }}>Highest Rated</option>
          </select>
        </div>

      </div>

    </header>
  );
}
