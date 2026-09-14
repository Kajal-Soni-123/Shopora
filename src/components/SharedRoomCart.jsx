import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, ArrowRight, Calculator, Check, Users, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SharedRoomCart({ isOpen, onClose, cartItems, onRemoveItem, members }) {
  const [isSplitView, setIsSplitView] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  if (!isOpen) return null;

  // Total items and subtotals
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const rawSubtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Shared Room Discount (15% off if 3+ items in room cart)
  const discountUnlocked = totalCount >= 3;
  const discountAmount = discountUnlocked ? rawSubtotal * 0.15 : 0;
  const finalTotal = rawSubtotal - discountAmount;

  // Breakdown per member
  const memberTotals = members.map(m => {
    const memberItems = cartItems.filter(item => item.addedBy === m.name || (m.isHost && item.addedBy === 'Alex (Host)'));
    const sub = memberItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return {
      member: m,
      items: memberItems,
      subtotal: sub,
      share: discountUnlocked ? sub * 0.85 : sub
    };
  });

  const handleCheckout = () => {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    setCheckoutComplete(true);
    setTimeout(() => {
      setCheckoutComplete(false);
      onClose();
    }, 2500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(9, 13, 22, 0.7)', backdropFilter: 'blur(8px)' }}>
      
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        height: '100vh',
        borderRadius: 0,
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        padding: 0
      }}>

        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="#EC4899" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'Space Grotesk' }}>Shared Room Cart</h3>
            <span style={{ background: 'rgba(236,72,153,0.15)', color: '#EC4899', fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '9999px' }}>
              {totalCount} items
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Room Shared Discount Meter */}
        <div style={{ padding: '14px 20px', background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles size={20} color="#6366F1" />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: discountUnlocked ? '#10B981' : '#F59E0B', marginBottom: '2px' }}>
              {discountUnlocked ? '🎉 15% ROOM BUNDLE DISCOUNT UNLOCKED!' : `Add ${3 - totalCount} more item(s) to unlock 15% Room Discount!`}
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((totalCount / 3) * 100, 100)}%`, background: '#6366F1', height: '100%', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>

        {/* View Switcher: Combined vs Split Bill */}
        <div style={{ display: 'flex', padding: '12px 20px', gap: '10px', background: 'rgba(15, 23, 42, 0.4)' }}>
          <button
            onClick={() => setIsSplitView(false)}
            style={{
              flexGrow: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: !isSplitView ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: !isSplitView ? '#fff' : '#94A3B8'
            }}
          >
            Combined Room List
          </button>
          <button
            onClick={() => setIsSplitView(true)}
            style={{
              flexGrow: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: isSplitView ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
              color: isSplitView ? '#818CF8' : '#94A3B8'
            }}
          >
            <Calculator size={14} /> Split Bill breakdown
          </button>
        </div>

        {/* Cart Body */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', marginTop: '60px' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: '600' }}>Shared Cart is Empty</p>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>Browse products and add items together!</p>
            </div>
          ) : !isSplitView ? (
            /* Combined List */
            cartItems.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '12px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                <img src={item.image} alt={item.name} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#EC4899', fontWeight: '700' }}>Added by {item.addedBy}</div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#F8FAFC', marginBottom: '2px' }}>{item.name}</h4>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#6366F1' }}>${item.price}</div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            /* Split Bill per Member */
            memberTotals.map((mt, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={mt.member.avatar} alt={mt.member.name} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${mt.member.color}` }} />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#F8FAFC' }}>{mt.member.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10B981', fontFamily: 'Space Grotesk' }}>${mt.share.toFixed(2)}</div>
                    {discountUnlocked && <div style={{ fontSize: '0.7rem', color: '#64748B', textDecoration: 'line-through' }}>${mt.subtotal}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {mt.items.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#64748B', italic: 'true' }}>No items added yet</span>
                  ) : (
                    mt.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94A3B8' }}>
                        <span>• {item.name}</span>
                        <span>${item.price}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}

        </div>

        {/* Footer Checkout Summary */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.9)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.85rem' }}>
              <span>Room Subtotal</span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>
            {discountUnlocked && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontSize: '0.85rem', fontWeight: '700' }}>
                <span>15% Bundle Savings</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F8FAFC', fontSize: '1.2rem', fontWeight: '800', fontFamily: 'Space Grotesk', marginTop: '6px' }}>
              <span>Total Amount</span>
              <span style={{ color: '#EC4899' }}>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutComplete || cartItems.length === 0}
            className="btn-pink"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
          >
            {checkoutComplete ? (
              <> <Check size={20} /> Order Placed Successfully! </>
            ) : (
              <> Instant Split Checkout <ArrowRight size={18} /> </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
