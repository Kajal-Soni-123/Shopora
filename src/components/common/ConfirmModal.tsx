'use client';

import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  error?: string | null;
}

const variantStyles = {
  danger: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    iconBg: 'bg-rose-100 text-rose-600',
    titleColor: 'text-rose-950',
    descColor: 'text-rose-700',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-100 text-amber-600',
    titleColor: 'text-amber-950',
    descColor: 'text-amber-700',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-100 text-indigo-600',
    titleColor: 'text-indigo-950',
    descColor: 'text-indigo-700',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
    icon: Info,
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description,
  itemName,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  error = null,
}) => {
  const style = variantStyles[variant];
  const IconComponent = style.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className={`p-4 ${style.bg} border ${style.border} rounded-2xl flex items-start gap-3.5`}>
          <div className={`p-2.5 ${style.iconBg} rounded-xl shrink-0`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            {itemName && (
              <h4 className={`text-sm font-extrabold ${style.titleColor}`}>
                &quot;{itemName}&quot;
              </h4>
            )}
            <div className={`text-xs ${style.descColor} font-medium leading-relaxed`}>
              {description || 'Are you sure you want to proceed with this action? This action cannot be undone.'}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-600 hover:text-slate-900"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            type="button"
            isLoading={isLoading}
            onClick={onConfirm}
            className={`font-bold shadow-md ${style.btnClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
