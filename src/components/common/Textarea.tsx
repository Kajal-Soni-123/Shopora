'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', disabled, ...props }, ref) => {
    const renderLabel = () => {
      if (!label) return null;
      if (label.includes('*')) {
        const parts = label.split('*');
        return (
          <label className="text-xs font-bold text-slate-700 block">
            {parts[0]}
            <span className="text-rose-500 font-extrabold ml-0.5">*</span>
            {parts.slice(1).join('*')}
          </label>
        );
      }
      return <label className="text-xs font-bold text-slate-700 block">{label}</label>;
    };

    return (
      <div className="space-y-1.5 w-full">
        {renderLabel()}

        <textarea
          ref={ref}
          disabled={disabled}
          className={`w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 transition-[border-color,background-color,box-shadow] duration-150 outline-none focus:outline-none focus-visible:outline-none ${
            error
              ? 'border-rose-300 ring-2 ring-rose-500/10 focus:border-rose-500'
              : 'border-slate-200/90 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''} ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] font-semibold text-rose-500 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-medium text-slate-400 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
