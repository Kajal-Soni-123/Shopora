'use client';

import React from 'react';

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, checked, onChange, disabled, className = '', ...props }, ref) => {
    return (
      <label
        className={`flex items-start gap-3 cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center mt-0.5">
          <input
            type="radio"
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded-full border transition-all duration-200 flex items-center justify-center ${
              checked
                ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-600/30'
                : 'bg-slate-50 border-slate-300 hover:border-indigo-400'
            }`}
          >
            {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        </div>

        {(label || description) && (
          <div>
            {label && <span className="text-xs font-bold text-slate-800 block">{label}</span>}
            {description && <span className="text-[11px] font-medium text-slate-500 block">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
