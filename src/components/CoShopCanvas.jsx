import React, { useState } from 'react';
import { Layers, Plus, Trash2, Move, Sparkles, Share2 } from 'lucide-react';

export default function CoShopCanvas({ canvasItems, onRemoveFromCanvas, members, products, onAddToCart }) {
  const [draggedItem, setDraggedItem] = useState(null);

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Space Grotesk' }}>Collaborative Look Canvas</h2>
            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', fontSize: '0.75rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>
              LIVE ROOM BOARD
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '4px' }}>
            Drag and position items to assemble matching outfit bundles together in real time.
          </p>
        </div>

        {/* Active Cursors / Room Members */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 14px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>Active Cursors:</span>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: m.color }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color, display: 'inline-block' }}></span>
              {m.name.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas Work Area */}
      <div style={{
        flexGrow: 1,
        position: 'relative',
        minHeight: '420px',
        background: 'rgba(9, 13, 22, 0.6)',
        borderRadius: '16px',
        border: '2px dashed rgba(255,255,255,0.1)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>

        {canvasItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748B' }}>
            <Layers size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: '600', fontSize: '1rem' }}>No items on the canvas yet</p>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>Click "Add to Canvas" on products in the catalog to build an outfit together!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
            {canvasItems.map((item, index) => (
              <div
                key={item.canvasId || item.id}
                className="glass-card"
                style={{
                  width: '220px',
                  padding: '12px',
                  position: 'relative',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s ease'
                }}
              >
                {/* Placed by badge */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '10px',
                  background: '#6366F1',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}>
                  Placed by {item.addedBy || 'Alex'}
                </div>

                <img src={item.image} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#F8FAFC', marginBottom: '4px' }}>{item.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#EC4899' }}>${item.price}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onAddToCart(item)}
                      title="Add item to Shared Cart"
                      style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      + Cart
                    </button>
                    <button
                      onClick={() => onRemoveFromCanvas(item.canvasId || item.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#EF4444', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
