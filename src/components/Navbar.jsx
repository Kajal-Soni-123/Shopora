import React, { useState } from 'react';
import { 
  Users, 
  Mic, 
  MicOff, 
  Share2, 
  ShoppingBag, 
  Sparkles, 
  Flame, 
  Heart, 
  Zap, 
  DollarSign, 
  ThumbsDown,
  Layers,
  Copy,
  Check
} from 'lucide-react';

export default function Navbar({ 
  roomCode, 
  members, 
  activeView, 
  setActiveView, 
  cartCount, 
  setIsCartOpen,
  onSendReaction,
  activePoll
}) {
  const [copied, setCopied] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="glass-panel" style={{ position: 'sticky', top: '12px', zIndex: 100, margin: '12px 16px 20px', padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Left: Brand Logo & Room Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
            }}>
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #fff, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SYNC <span style={{ color: '#6366F1', WebkitTextFillColor: '#6366F1', fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(99,102,241,0.15)', borderRadius: '6px', marginLeft: '6px' }}>CO-SHOP</span>
              </div>
            </div>
          </div>

          {/* Room Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="online-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94A3B8' }}>ROOM:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#F8FAFC', fontFamily: 'Space Grotesk' }}>#{roomCode}</span>
            <button 
              onClick={copyRoomLink}
              title="Copy Room Link"
              style={{ background: 'none', border: 'none', color: copied ? '#10B981' : '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Center: Interactive Live Reaction Trigger Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Sync:</span>
          {[
            { emoji: '🔥', label: 'Fire' },
            { emoji: '❤️', label: 'Love' },
            { emoji: '🤯', label: 'Mindblown' },
            { emoji: '💸', label: 'Buy' },
            { emoji: '👎', label: 'Pass' }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSendReaction(item.emoji)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title={`Send ${item.label} Reaction`}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        {/* Right: Members Bar, Audio Toggle, View Toggle & Cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Members Avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', marginLeft: '8px' }}>
              {members.map((m, idx) => (
                <div 
                  key={m.id} 
                  title={`${m.name} (${m.status})`}
                  style={{
                    position: 'relative',
                    marginLeft: idx > 0 ? '-10px' : '0',
                    zIndex: members.length - idx
                  }}
                >
                  <img 
                    src={m.avatar} 
                    alt={m.name} 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: `2px solid ${m.color}`,
                      objectFit: 'cover'
                    }} 
                  />
                  {m.isHost && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#EC4899',
                      color: 'white',
                      fontSize: '0.6rem',
                      fontWeight: '800',
                      padding: '1px 4px',
                      borderRadius: '9999px',
                      border: '1px solid #090D16'
                    }}>
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              style={{
                background: isMicOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${isMicOn ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: isMicOn ? '#10B981' : '#EF4444',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
          </div>

          {/* Navigation View Switcher */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setActiveView('catalog')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeView === 'catalog' ? 'var(--accent-primary)' : 'transparent',
                color: activeView === 'catalog' ? '#fff' : '#94A3B8',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={15} /> Catalog
            </button>
            <button
              onClick={() => setActiveView('canvas')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeView === 'canvas' ? 'var(--accent-primary)' : 'transparent',
                color: activeView === 'canvas' ? '#fff' : '#94A3B8',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={15} /> Look Canvas
            </button>
          </div>

          {/* Shared Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="btn-pink"
            style={{ position: 'relative' }}
          >
            <ShoppingBag size={18} />
            <span>Shared Cart</span>
            {cartCount > 0 && (
              <span style={{
                background: '#fff',
                color: '#EC4899',
                fontSize: '0.75rem',
                fontWeight: '800',
                borderRadius: '9999px',
                padding: '2px 7px',
                marginLeft: '4px'
              }}>
                {cartCount}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
}
