'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, helperText, className = '', disabled, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="text-xs font-bold text-slate-700 block">{label}</label>}

        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 transition-[border-color,background-color,box-shadow] duration-150 outline-none focus:outline-none focus-visible:outline-none ${
              icon ? 'pl-10 pr-4' : 'px-4'
            } ${
              error
                ? 'border-rose-300 ring-2 ring-rose-500/10 focus:border-rose-500'
                : 'border-slate-200/90 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''} ${className}`}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-[11px] font-semibold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-medium text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
