'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WishlistProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  vendorId?: string;
  categoryId?: string;
  vendor?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

interface WishlistContextType {
  wishlist: WishlistProduct[];
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistProduct) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Sync current logged in user from localStorage / currentUser
  useEffect(() => {
    const checkUser = () => {
      try {
        const savedUser = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed?.id) {
            setUserId(parsed.id);
            return;
          }
        }
      } catch (err) {
        console.error('Error parsing user for wishlist:', err);
      }
      setUserId(null);
    };

    checkUser();
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  // Fetch or load wishlist items
  useEffect(() => {
    const loadWishlist = async () => {
      if (userId) {
        try {
          const res = await fetch(`/api/wishlist?userId=${userId}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setWishlist(json.data);
            localStorage.setItem('shopora_wishlist', JSON.stringify(json.data));
            return;
          }
        } catch (err) {
          console.error('Failed to load server wishlist:', err);
        }
      }

      // Guest or server fallback
      const local = localStorage.getItem('shopora_wishlist');
      if (local) {
        try {
          setWishlist(JSON.parse(local));
        } catch (e) {
          setWishlist([]);
        }
      }
    };

    loadWishlist();
  }, [userId]);

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleWishlist = async (product: WishlistProduct) => {
    const exists = isInWishlist(product.id);
    let updatedWishlist: WishlistProduct[];

    if (exists) {
      updatedWishlist = wishlist.filter((item) => item.id !== product.id);
    } else {
      updatedWishlist = [product, ...wishlist];
    }

    setWishlist(updatedWishlist);
    localStorage.setItem('shopora_wishlist', JSON.stringify(updatedWishlist));

    if (userId) {
      try {
        if (exists) {
          await fetch(`/api/wishlist?userId=${userId}&productId=${product.id}`, {
            method: 'DELETE',
          });
        } else {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, productId: product.id }),
          });
        }
      } catch (err) {
        console.error('Error syncing wishlist with server:', err);
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    const updatedWishlist = wishlist.filter((item) => item.id !== productId);
    setWishlist(updatedWishlist);
    localStorage.setItem('shopora_wishlist', JSON.stringify(updatedWishlist));

    if (userId) {
      try {
        await fetch(`/api/wishlist?userId=${userId}&productId=${productId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error removing from server wishlist:', err);
      }
    }
  };

  const clearWishlist = () => {
    setWishlist([]);
    localStorage.removeItem('shopora_wishlist');
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlistOpen,
        setIsWishlistOpen,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
