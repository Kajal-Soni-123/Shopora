'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/common/Modal';
import { LogIn, UserPlus, ShoppingBag, ShieldAlert } from 'lucide-react';
import { ShoporaLogo } from '@/components/common/ShoporaLogo';

export function LoginRequiredModal() {
  const {
    isLoginRequiredModalOpen,
    closeLoginRequiredModal,
    openAuthModal,
  } = useAuth();

  if (!isLoginRequiredModalOpen) return null;

  return (
    <Modal
      isOpen={isLoginRequiredModalOpen}
      onClose={closeLoginRequiredModal}
      maxWidth="md"
    >
      <div className="text-center py-4 px-2 space-y-5">
        <div className="relative w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <ShoppingBag className="w-8 h-8" />
          <div className="absolute -top-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow-md">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            <ShoporaLogo variant="icon" size="sm" />
            <span>Authentication Required</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Please Sign In to Buy Products
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed font-medium">
            Guest users can browse products freely. To add items to your cart, place orders, or save items, please sign in or create an account.
          </p>
        </div>

        <div className="pt-2 space-y-2.5">
          <button
            onClick={() => {
              closeLoginRequiredModal();
              openAuthModal('login');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Your Account
          </button>

          <button
            onClick={() => {
              closeLoginRequiredModal();
              openAuthModal('signup');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200/80 active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            Create New Account
          </button>

          <button
            onClick={closeLoginRequiredModal}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
          >
            Continue Browsing Catalog
          </button>
        </div>
      </div>
    </Modal>
  );
}
