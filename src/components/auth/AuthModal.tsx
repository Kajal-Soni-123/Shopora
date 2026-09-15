'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Flyout } from '@/components/common/Flyout';
import { LogIn, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

export function AuthModal() {
  const { isAuthModalOpen, authModalTab, closeAuthModal, login, signup } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(authModalTab);

  // Sync tab state when modal opens
  React.useEffect(() => {
    setActiveTab(authModalTab);
  }, [authModalTab, isAuthModalOpen]);

  const handleTabSwitch = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleSuccess = () => {
    triggerConfetti();
    closeAuthModal();
  };

  return (
    <Flyout
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      title={
        <div className="flex items-center gap-3">
          <ShoporaLogo variant="icon" size="sm" />
          <span>{activeTab === 'login' ? 'Welcome Back!' : 'Join Shopora'}</span>
        </div>
      }
      subtitle={
        activeTab === 'login'
          ? 'Sign in to manage your account, store & orders'
          : 'Create an account as a Shopper or Merchant Partner'
      }
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/80 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {activeTab === 'login' ? (
            <LoginForm onSuccess={handleSuccess} loginFn={login} />
          ) : (
            <SignupForm onSuccess={handleSuccess} signupFn={signup} />
          )}

          {/* Switch tab hint */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => handleTabSwitch(activeTab === 'login' ? 'signup' : 'login')}
              className="text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            >
              {activeTab === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </Flyout>
  );
}
