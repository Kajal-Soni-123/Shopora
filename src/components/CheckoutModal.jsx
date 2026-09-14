import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, Truck, ArrowRight, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutModal({ isOpen, onClose, cartItems, onOrderComplete }) {
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [formData, setFormData] = useState({
    name: 'Kajal Patel',
    email: 'kajal@example.com',
    address: '42 Innovation Way',
    city: 'San Francisco',
    zip: '94105',
    paymentMethod: 'card'
  });

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setStep(3);
      onOrderComplete();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
        >
          <X size={22} />
        </button>

        {/* Wizard Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          {[
            { num: 1, label: 'Shipping' },
            { num: 2, label: 'Payment' },
            { num: 3, label: 'Complete' }
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step >= s.num ? '#6366F1' : 'rgba(255,255,255,0.1)',
                color: step >= s.num ? '#fff' : '#94A3B8',
                fontSize: '0.8rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {s.num}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: step >= s.num ? '#F8FAFC' : '#64748B' }}>
                {s.label}
              </span>
              {s.num < 3 && <div style={{ width: '24px', height: '2px', background: step > s.num ? '#6366F1' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {/* Step 1: Shipping Address Form */}
        {step === 1 && (
          <form onSubmit={handleNextStep}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: '#F8FAFC' }}>
              Shipping Address
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="glass-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="glass-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>STREET ADDRESS</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="glass-input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>CITY</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="glass-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>POSTAL CODE</label>
                  <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} required className="glass-input" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Continue to Payment <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <form onSubmit={handleNextStep}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', color: '#F8FAFC' }}>
              Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex' },
                { id: 'upi', name: 'Instant UPI / QR Code', desc: 'Google Pay, PhonePe, Paytm' },
                { id: 'apple', name: 'Apple Pay / Google Wallet', desc: 'Express 1-Touch Checkout' }
              ].map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: formData.paymentMethod === m.id ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.paymentMethod === m.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={formData.paymentMethod === m.id}
                    onChange={handleInputChange}
                    style={{ accentColor: '#6366F1' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#F8FAFC' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Total Payable Amount:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10B981', fontFamily: 'Space Grotesk' }}>${totalAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ padding: '12px 16px' }}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="submit" className="btn-pink" style={{ flexGrow: 1, justifyContent: 'center', padding: '12px' }}>
                Pay ${totalAmount.toFixed(2)} Now
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid #10B981' }}>
              <CheckCircle2 size={36} />
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#F8FAFC', marginBottom: '6px' }}>
              Order Placed Successfully!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px' }}>
              Confirmation sent to <span style={{ color: '#818CF8' }}>{formData.email}</span>. Order #NX-{Math.floor(100000 + Math.random() * 900000)}.
            </p>

            <button onClick={onClose} className="btn-primary" style={{ padding: '10px 24px' }}>
              Back to Shopping
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
