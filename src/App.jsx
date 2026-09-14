import React, { useState, useEffect } from 'react';
import StandardHeader, { CATEGORIES } from './components/StandardHeader';
import ProductCard from './components/ProductCard';
import ProductQuickViewModal from './components/ProductQuickViewModal';
import StandardCartDrawer from './components/StandardCartDrawer';
import CheckoutModal from './components/CheckoutModal';
import BuyOrByePollModal from './components/BuyOrByePollModal';
import SharedRoomCart from './components/SharedRoomCart';
import CoShopCanvas from './components/CoShopCanvas';
import ActivitySidebar from './components/ActivitySidebar';
import FloatingReactions from './components/FloatingReactions';
import { PRODUCTS, INITIAL_ROOM_MEMBERS } from './data/products';
import { Sparkles, Eye, ShoppingBag, Heart, Check, Users, ArrowRight } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState(PRODUCTS);
  const [mode, setMode] = useState('standard'); // 'standard' | 'coshop'

  // Standard Store State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [wishlist, setWishlist] = useState(['p1']);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isStandardCartOpen, setIsStandardCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Standard Cart Items
  const [cartItems, setCartItems] = useState([
    { ...PRODUCTS[0], quantity: 1, size: 'M' }
  ]);

  // Co-Shop Social Room State
  const [members, setMembers] = useState(INITIAL_ROOM_MEMBERS);
  const [coShopView, setCoShopView] = useState('catalog'); // 'catalog' | 'canvas'
  const [isCoShopCartOpen, setIsCoShopCartOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  
  const [canvasItems, setCanvasItems] = useState([
    { ...PRODUCTS[0], canvasId: 'c1', addedBy: 'Alex (Host)' },
    { ...PRODUCTS[2], canvasId: 'c2', addedBy: 'Sam' }
  ]);

  const [activePoll, setActivePoll] = useState({
    id: 'poll-101',
    product: PRODUCTS[0],
    creator: 'Alex (Host)',
    votes: { buy: 8, bye: 3 },
    userVote: null,
    timeLeft: 25,
    comments: [
      { user: 'Alex (Host)', text: 'Is this cyber jacket worth $240? Should I grab it?' },
      { user: 'Sam', text: '100% buy, the thermal regulator is insane!' }
    ]
  });

  const [showPollModal, setShowPollModal] = useState(false);

  const [activities, setActivities] = useState([
    { id: 'a1', type: 'poll', user: 'Alex (Host)', text: 'started a Buy or Bye poll for AeroTech Parka', time: '2m ago' },
    { id: 'a2', type: 'cart', user: 'Alex (Host)', text: 'added AeroTech Cyber Parka to Shared Cart', time: '1m ago' },
    { id: 'a3', type: 'suggest', user: 'Sam', text: 'suggested Prism HUD Visor Glasses to room', time: 'Just now' }
  ]);

  const [messages, setMessages] = useState([
    { id: 'm1', user: 'Alex (Host)', text: 'Hey Kajal! Check out the shared room cart. Let’s get 3 items for the 15% discount!', time: '17:24', isMe: false },
    { id: 'm2', user: 'Sam', text: 'I placed the visor glasses on the Outfit Canvas board 🔥', time: '17:25', isMe: false }
  ]);

  // Floating Emoji Reaction Trigger
  const triggerReaction = (emoji, xPos = null) => {
    const newId = Date.now() + Math.random();
    const x = xPos !== null ? xPos : Math.floor(Math.random() * 80) + 10;
    setFloatingReactions(prev => [...prev, { id: newId, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newId));
    }, 2200);
  };

  // Filter & Sort Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // featured
  });

  // Standard Store Handlers
  const handleToggleWishlist = (productId) => {
    setWishlist(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.size === (product.size || 'M'));
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, size: product.size || 'M' }];
    });
    setIsStandardCartOpen(true);
  };

  const handleUpdateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  // Co-Shop Room Handlers
  const handleLaunchPoll = (product) => {
    setActivePoll({
      id: `poll-${Date.now()}`,
      product,
      creator: 'Kajal (You)',
      votes: { buy: 3, bye: 1 },
      userVote: null,
      timeLeft: 30,
      comments: [{ user: 'Kajal (You)', text: `Should I buy ${product.name}? Help me decide!` }]
    });
    setShowPollModal(true);
  };

  const handleVotePoll = (pollId, voteType) => {
    setActivePoll(prev => {
      if (!prev) return null;
      const newVotes = { ...prev.votes, [voteType]: prev.votes[voteType] + 1 };
      return { ...prev, votes: newVotes, userVote: voteType };
    });
    triggerReaction(voteType === 'buy' ? '🔥' : '👎');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Floating Reactions */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Main Glass Header */}
      <StandardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        wishlistCount={wishlist.length}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        setIsCartOpen={setIsStandardCartOpen}
        mode={mode}
        setMode={setMode}
      />

      {/* Mode Status Indicator Banner */}
      <div style={{ margin: '0 16px 16px' }}>
        {mode === 'standard' ? (
          <div className="glass-panel" style={{ padding: '16px 24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                CORE STORE EXPERIENCE
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Space Grotesk', color: '#F8FAFC' }}>
                Curated Cyberpunk & Modern Techwear Catalog
              </h2>
            </div>
            <button
              onClick={() => setMode('coshop')}
              className="btn-pink"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Switch to Co-Shop Social Room
            </button>
          </div>
        ) : (
          <div className="glass-panel shimmer-badge" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#EC4899', textTransform: 'uppercase', letterSpacing: '1px' }}>
                👥 CO-SHOP ROOM ACTIVE (#SHOP-8921)
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Space Grotesk', color: '#F8FAFC' }}>
                Synchronous Social Shopping with Friends
              </h2>
            </div>
            <button
              onClick={() => setMode('standard')}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Return to Standard Store
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {mode === 'standard' ? (
        /* STANDARD E-COMMERCE VIEW */
        <main style={{ flexGrow: 1, padding: '0 16px 32px' }}>
          
          {/* Results Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: '600' }}>
              Showing {filteredProducts.length} products
            </span>
            {searchQuery && (
              <span style={{ fontSize: '0.85rem', color: '#818CF8' }}>
                Results for "{searchQuery}"
              </span>
            )}
          </div>

          {/* Product Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filteredProducts.map((product) => {
              const isWishlisted = wishlist.includes(product.id);
              return (
                <div key={product.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  
                  {/* Image & Badges */}
                  <div style={{ position: 'relative', height: '240px', overflow: 'hidden', background: '#0F172A' }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    
                    {/* Wishlist Button */}
                    <button
                      onClick={() => handleToggleWishlist(product.id)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Heart size={18} color={isWishlisted ? "#EC4899" : "#fff"} fill={isWishlisted ? "#EC4899" : "none"} />
                    </button>

                    {/* Quick View Button */}
                    <button
                      onClick={() => setQuickViewProduct(product)}
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        borderRadius: '9999px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={14} /> Quick View
                    </button>

                    {/* Price Tag */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(99, 102, 241, 0.9)',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '0.95rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontFamily: 'Space Grotesk'
                    }}>
                      ${product.price}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6366F1', textTransform: 'uppercase' }}>
                        {product.category}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#F8FAFC', margin: '4px 0 6px', lineHeight: '1.3' }}>
                        {product.name}
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: '1.4', marginBottom: '14px' }}>
                        {product.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    >
                      <ShoppingBag size={16} /> Add to Cart
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </main>
      ) : (
        /* CO-SHOP SOCIAL ROOM VIEW */
        <main style={{ flexGrow: 1, padding: '0 16px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          <div>
            {coShopView === 'catalog' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onLaunchPoll={handleLaunchPoll}
                    onAddToCart={handleAddToCart}
                    onSuggestToRoom={(p) => setCanvasItems(prev => [...prev, { ...p, canvasId: `c-${Date.now()}`, addedBy: 'Kajal (You)' }])}
                    onReaction={(id, type) => triggerReaction(type === 'fire' ? '🔥' : '❤️')}
                  />
                ))}
              </div>
            ) : (
              <CoShopCanvas
                canvasItems={canvasItems}
                onRemoveFromCanvas={(id) => setCanvasItems(prev => prev.filter(i => (i.canvasId || i.id) !== id))}
                members={members}
                products={products}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>

          <div style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '90px' }}>
            <ActivitySidebar
              activities={activities}
              messages={messages}
              onSendMessage={(text) => setMessages(prev => [...prev, { id: Date.now().toString(), user: 'Kajal (You)', text, time: 'Just now', isMe: true }])}
              onSendReaction={triggerReaction}
            />
          </div>
        </main>
      )}

      {/* Product Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAddToCart}
          isWishlisted={wishlist.includes(quickViewProduct.id)}
          onToggleWishlist={handleToggleWishlist}
        />
      )}

      {/* Standard Cart Drawer */}
      <StandardCartDrawer
        isOpen={isStandardCartOpen}
        onClose={() => setIsStandardCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.id !== id))}
        onProceedToCheckout={() => {
          setIsStandardCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Multi-step Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderComplete={() => setCartItems([])}
      />

      {/* Co-Shop Poll Modal */}
      {showPollModal && activePoll && (
        <BuyOrByePollModal
          poll={activePoll}
          onClose={() => setShowPollModal(false)}
          onVote={handleVotePoll}
        />
      )}

    </div>
  );
}
