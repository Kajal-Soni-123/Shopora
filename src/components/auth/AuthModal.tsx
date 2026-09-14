'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, LogIn, UserPlus } from 'lucide-react';
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

  if (!isAuthModalOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={closeAuthModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white/95 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl z-10 animate-in zoom-in-95 duration-200">
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 rounded-full transition-all duration-200 z-20"
          aria-label="Close auth modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="pt-8 px-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <ShoporaLogo variant="icon" size="md" />
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {activeTab === 'login' ? 'Welcome Back!' : 'Join Shopora'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === 'login'
                  ? 'Sign in to manage your account, store & orders'
                  : 'Create an account as a Shopper or Merchant Partner'}
              </p>
            </div>
          </div>

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
        </div>

        {/* Form Body */}
        <div className="px-8 pb-8 space-y-4">
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
    </div>
  );
}
