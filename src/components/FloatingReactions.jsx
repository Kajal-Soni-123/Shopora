import React from 'react';

export default function FloatingReactions({ reactions }) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {reactions.map((r) => (
        <div
          key={r.id}
          className="floating-emoji"
          style={{
            left: `${r.x}%`,
            bottom: '80px'
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
