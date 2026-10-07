'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const LOCAL_KEY = 'shopora_wishlist';

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
  // The logged-in user comes from AuthContext (cookie session); guests keep a local-only wishlist
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const prevUserIdRef = useRef<string | null>(null);

  const saveLocal = (items: WishlistProduct[]) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  };
  const readLocal = (): WishlistProduct[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const previous = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    const load = async () => {
      if (!userId) {
        // Just logged out → don't leave the previous account's wishlist on this device
        if (previous) {
          localStorage.removeItem(LOCAL_KEY);
          setWishlist([]);
        } else {
          setWishlist(readLocal());
        }
        return;
      }

      try {
        // Items saved while signed out (or before wishlists were stored on the account) move into the account
        const local = readLocal();
        if (local.length && !previous) {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: local.map((p) => p.id) }),
          });
        }
        const res = await fetch('/api/wishlist');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWishlist(json.data);
          saveLocal(json.data);
        }
      } catch (err) {
        console.error('Failed to load wishlist:', err);
        setWishlist(readLocal());
      }
    };

    load();
  }, [userId, authLoading]);

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
    saveLocal(updatedWishlist);

    if (userId) {
      try {
        if (exists) {
          await fetch(`/api/wishlist?productId=${product.id}`, { method: 'DELETE' });
        } else {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.id }),
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
    saveLocal(updatedWishlist);

    if (userId) {
      try {
        await fetch(`/api/wishlist?productId=${productId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Error removing from server wishlist:', err);
      }
    }
  };

  const clearWishlist = () => {
    setWishlist([]);
    localStorage.removeItem(LOCAL_KEY);
    // Signed in: the wishlist is stored on the account, so clear it there too
    if (userId) {
      fetch('/api/wishlist?all=true', { method: 'DELETE' }).catch((err) =>
        console.error('Error clearing server wishlist:', err)
      );
    }
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
