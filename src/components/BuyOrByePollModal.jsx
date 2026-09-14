import React, { useState, useEffect } from 'react';
import { Vote, Clock, CheckCircle2, XCircle, Sparkles, X, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BuyOrByePollModal({ poll, onClose, onVote }) {
  const [timeLeft, setTimeLeft] = useState(poll.timeLeft || 30);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(poll.comments || [
    { user: 'Alex (Host)', text: 'The techwear vibe matches your sneakers perfectly!' },
    { user: 'Sam', text: 'Looks fire, but check the sizing guide first!' }
  ]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCastVote = (voteType) => {
    onVote(poll.id, voteType);
    if (voteType === 'buy') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments([...comments, { user: 'Kajal (You)', text: commentText }]);
    setCommentText('');
  };

  const totalVotes = poll.votes.buy + poll.votes.bye;
  const buyPercent = totalVotes > 0 ? Math.round((poll.votes.buy / totalVotes) * 100) : 50;
  const byePercent = 100 - buyPercent;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '24px',
        border: '1px solid rgba(236, 72, 153, 0.4)',
        boxShadow: '0 0 40px rgba(236, 72, 153, 0.25)',
        position: 'relative'
      }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
            padding: '8px 12px',
            borderRadius: '9999px',
            color: 'white',
            fontWeight: '800',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Vote size={14} /> LIVE ROOM POLL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontWeight: '700', fontSize: '0.85rem' }}>
            <Clock size={15} /> {timeLeft}s remaining
          </div>
        </div>

        {/* Product Details Box */}
        <div style={{ display: 'flex', gap: '16px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <img src={poll.product.image} alt={poll.product.name} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#EC4899', fontWeight: '700' }}>Initiated by {poll.creator}</div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#F8FAFC', marginBottom: '4px' }}>{poll.product.name}</h4>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#6366F1', fontFamily: 'Space Grotesk' }}>${poll.product.price}</div>
          </div>
        </div>

        {/* Vote Progress Bars */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '800' }}>
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔥 BUY THIS! ({buyPercent}%)
            </span>
            <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ❌ BYE / PASS ({byePercent}%)
            </span>
          </div>

          <div style={{ height: '14px', background: 'rgba(239, 68, 68, 0.4)', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${buyPercent}%`,
              background: 'linear-gradient(90deg, #10B981, #34D399)',
              transition: 'width 0.4s ease',
              height: '100%'
            }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
            Total Votes Cast: {totalVotes}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => handleCastVote('buy')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: poll.userVote === 'buy' ? '2px solid #10B981' : '1px solid rgba(16, 185, 129, 0.3)',
              background: poll.userVote === 'buy' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ThumbsUp size={18} /> VOTE BUY 🔥
          </button>
          
          <button
            onClick={() => handleCastVote('bye')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: poll.userVote === 'bye' ? '2px solid #EF4444' : '1px solid rgba(239, 68, 68, 0.3)',
              background: poll.userVote === 'bye' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ThumbsDown size={18} /> VOTE BYE ❌
          </button>
        </div>

        {/* Live Chat Stream in Poll */}
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={13} /> Live Poll Advice ({comments.length})
          </div>
          <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {comments.map((c, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                <span style={{ fontWeight: '700', color: '#6366F1' }}>{c.user}: </span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Give your quick advice..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="glass-input"
              style={{ flexGrow: 1, fontSize: '0.8rem', padding: '8px 12px' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
