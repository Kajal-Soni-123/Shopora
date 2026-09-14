import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Zap, Send, Heart, Flame, Vote, ShoppingBag, Share2 } from 'lucide-react';

export default function ActivitySidebar({ activities, messages, onSendMessage, onSendReaction }) {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'chat'
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activities]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'poll': return <Vote size={14} color="#EC4899" />;
      case 'cart': return <ShoppingBag size={14} color="#10B981" />;
      case 'suggest': return <Share2 size={14} color="#6366F1" />;
      case 'reaction': return <Flame size={14} color="#F59E0B" />;
      default: return <Zap size={14} color="#06B6D4" />;
    }
  };

  return (
    <aside className="glass-panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Header Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.5)' }}>
        <button
          onClick={() => setActiveTab('feed')}
          style={{
            flexGrow: 1,
            padding: '12px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: activeTab === 'feed' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'feed' ? '#818CF8' : '#94A3B8',
            borderBottom: activeTab === 'feed' ? '2px solid #6366F1' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Zap size={14} /> Room Feed ({activities.length})
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flexGrow: 1,
            padding: '12px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: activeTab === 'chat' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'chat' ? '#818CF8' : '#94A3B8',
            borderBottom: activeTab === 'chat' ? '2px solid #6366F1' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <MessageSquare size={14} /> Live Chat ({messages.length})
        </button>
      </div>

      {/* Stream Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {activeTab === 'feed' ? (
          activities.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', marginTop: '40px', fontSize: '0.85rem' }}>
              No room activities yet.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '10px', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.825rem' }}>
                <div style={{ marginTop: '2px' }}>
                  {getEventIcon(act.type)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontWeight: '700', color: '#F8FAFC' }}>{act.user} </span>
                  <span style={{ color: '#94A3B8' }}>{act.text}</span>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>{act.time}</div>
                </div>
              </div>
            ))
          )
        ) : (
          messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', marginTop: '40px', fontSize: '0.85rem' }}>
              No chat messages yet. Say hi to your room!
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.isMe ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                  border: msg.isMe ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '8px 12px'
                }}
              >
                {!msg.isMe && <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#EC4899', marginBottom: '2px' }}>{msg.user}</div>}
                <div style={{ fontSize: '0.825rem', color: '#F8FAFC' }}>{msg.text}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', textAlign: 'right', marginTop: '2px' }}>{msg.time}</div>
              </div>
            ))
          )
        )}
        <div ref={chatEndRef} />

      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.8)', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={activeTab === 'feed' ? "Type a room announcement..." : "Chat with room..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="glass-input"
          style={{ flexGrow: 1, fontSize: '0.8rem', padding: '8px 12px' }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>
          <Send size={15} />
        </button>
      </form>

    </aside>
  );
}
