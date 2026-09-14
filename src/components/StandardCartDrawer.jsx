import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Truck, Check } from 'lucide-react';

export default function StandardCartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) {
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  if (!isOpen) return null;

  const rawSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeShippingThreshold = 150;
  const isFreeShipping = rawSubtotal >= freeShippingThreshold;
  const shippingCost = isFreeShipping ? 0 : (rawSubtotal > 0 ? 15 : 0);

  const applyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'NEXUS10') {
      setDiscountPercent(10);
      setPromoApplied(true);
      setPromoError('');
    } else if (code === 'VIP15') {
      setDiscountPercent(15);
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid code. Try "WELCOME10" or "VIP15"');
    }
  };

  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const finalTotal = rawSubtotal - discountAmount + shippingCost;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}>
      
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        height: '100vh',
        borderRadius: 0,
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.1)',
        padding: 0,
        background: '#FFFFFF'
      }}>

        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="#4F46E5" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'Space Grotesk', color: '#0F172A' }}>Shopping Cart</h3>
            <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '9999px' }}>
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: isFreeShipping ? '#059669' : '#D97706', marginBottom: '6px' }}>
            <Truck size={16} />
            {isFreeShipping ? '🎉 YOU HAVE UNLOCKED FREE EXPRESS SHIPPING!' : `Add $${(freeShippingThreshold - rawSubtotal).toFixed(2)} more for FREE Shipping!`}
          </div>
          <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((rawSubtotal / freeShippingThreshold) * 100, 100)}%`, background: isFreeShipping ? '#059669' : '#D97706', height: '100%', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Cart Body */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', marginTop: '60px' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: '600', color: '#0F172A' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Discover products in our catalog and add them!</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: '12px', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
                <img src={item.image} alt={item.name} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} />
                
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A', marginBottom: '2px' }}>{item.name}</h4>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#4F46E5' }}>${item.price}</div>
                  {item.size && <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Size: {item.size}</span>}
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', borderRadius: '6px', padding: '2px 6px', border: '1px solid #E2E8F0' }}>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0F172A', minWidth: '16px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Promo Code Box */}
        {cartItems.length > 0 && (
          <div style={{ padding: '0 20px 14px' }}>
            <form onSubmit={applyPromo} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Tag size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Promo Code (e.g. WELCOME10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
                />
              </div>
              <button type="submit" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                Apply
              </button>
            </form>
            {promoApplied && <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: '700' }}>✓ Promo code applied! ({discountPercent}% off)</div>}
            {promoError && <div style={{ fontSize: '0.75rem', color: '#E11D48', marginTop: '4px' }}>{promoError}</div>}
          </div>
        )}

        {/* Order Summary & Checkout Action */}
        <div style={{ padding: '20px', borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.85rem' }}>
              <span>Subtotal</span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '0.85rem', fontWeight: '700' }}>
                <span>Discount ({discountPercent}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.85rem' }}>
              <span>Shipping</span>
              <span>{isFreeShipping ? <span style={{ color: '#059669', fontWeight: '700' }}>FREE</span> : `$${shippingCost.toFixed(2)}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0F172A', fontSize: '1.2rem', fontWeight: '800', fontFamily: 'Space Grotesk', marginTop: '6px' }}>
              <span>Total</span>
              <span style={{ color: '#4F46E5' }}>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={onProceedToCheckout}
            disabled={cartItems.length === 0}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
          >
            Proceed to Checkout <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
