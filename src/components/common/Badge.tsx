import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  secondary: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs rounded-full font-medium',
  md: 'px-2.5 py-1 text-xs rounded-full font-semibold',
  lg: 'px-3 py-1 text-sm rounded-full font-semibold',
};

export const Badge: React.FC<BadgeProps> = React.memo(({
  variant = 'neutral',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';
