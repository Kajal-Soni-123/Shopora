'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const maxWidthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export const Flyout: React.FC<FlyoutProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 'xl',
  children,
  footer,
}) => {
  // Prevent body scrolling when flyout is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen ${maxWidthClasses[maxWidth]} bg-white text-slate-900 flex flex-col border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300 relative`}
        >
          {/* Flyout Header */}
          <div className="px-6 py-5 sm:px-8 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0 shadow-xs z-10">
            <div className="pr-4">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">{title}</h2>
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flyout Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar pb-12">
            {children}
          </div>

          {/* Fixed Flyout Footer (Sticky Action Bar) */}
          {footer && (
            <div className="px-6 py-4 sm:px-8 bg-slate-50/90 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 z-20">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
