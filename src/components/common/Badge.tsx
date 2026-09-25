import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  secondary: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  info: 'bg-sky-50 text-sky-700 border border-sky-200/60',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
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
