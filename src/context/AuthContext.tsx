'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  primaryAddressType?: string | null;
  vendorId?: string | null;
  vendor?: {
    id: string;
    name: string;
    warehouseLocation: string;
  } | null;
  avatar?: string;
  createdAt?: string;
}

export interface SignupOptions {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'VENDOR';
  storeName?: string;
  warehouseLocation?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  isLoginRequiredModalOpen: boolean;
  isForgotPasswordModalOpen: boolean;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  openForgotPasswordModal: () => void;
  closeForgotPasswordModal: () => void;
  openLoginRequiredModal: () => void;
  closeLoginRequiredModal: () => void;
  requireAuth: (action: () => void) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (options: SignupOptions) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState<boolean>(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState<boolean>(false);

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
    setIsForgotPasswordModalOpen(false);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openForgotPasswordModal = () => {
    setIsAuthModalOpen(false);
    setIsForgotPasswordModalOpen(true);
  };

  const closeForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(false);
  };

  const openLoginRequiredModal = () => {
    setIsLoginRequiredModalOpen(true);
  };

  const closeLoginRequiredModal = () => {
    setIsLoginRequiredModalOpen(false);
  };

  const requireAuth = (action: () => void): boolean => {
    if (user) {
      action();
      return true;
    }
    setIsLoginRequiredModalOpen(true);
    return false;
  };

  // Fetch active session user on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setUser(data.data);
      closeAuthModal();
      closeLoginRequiredModal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  };

  const signup = async (options: SignupOptions) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Signup failed' };
      }
      setUser(data.data);
      closeAuthModal();
      closeLoginRequiredModal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('shopora_orders');
        localStorage.removeItem('latest_shopora_order');
        localStorage.removeItem('latest_nexus_order');
        localStorage.removeItem('shopora_cart');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalTab,
        isLoginRequiredModalOpen,
        isForgotPasswordModalOpen,
        openAuthModal,
        closeAuthModal,
        openForgotPasswordModal,
        closeForgotPasswordModal,
        openLoginRequiredModal,
        closeLoginRequiredModal,
        requireAuth,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
