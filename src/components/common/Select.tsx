'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const renderLabelWithRedAsterisk = (labelText: string) => {
  if (!labelText.includes('*')) return labelText;
  const parts = labelText.split('*');
  return (
    <>
      {parts[0]}
      <span className="text-rose-500 font-extrabold ml-0.5">*</span>
      {parts.slice(1).join('*')}
    </>
  );
};

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  icon,
  error,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-700 block">
          {renderLabelWithRedAsterisk(label)}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 transition-all duration-200 text-left ${
            error
              ? 'border-rose-300 ring-2 ring-rose-500/10'
              : isOpen
              ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15 shadow-sm'
              : 'border-slate-200/90 hover:bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {icon && <span className="text-slate-400">{icon}</span>}
            <span className={selectedOption ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </button>

        {/* Custom Popover Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate text-xs">
                    {option.icon && <span className="text-slate-400">{option.icon}</span>}
                    {option.label.includes(' > ') ? (
                      <span className="flex items-center gap-1.5 truncate">
                        {option.label.split(' > ').map((part, i, arr) => {
                          const isLast = i === arr.length - 1;
                          return (
                            <React.Fragment key={i}>
                              <span
                                className={
                                  isLast
                                    ? isSelected
                                      ? 'font-black text-indigo-700'
                                      : 'font-extrabold text-slate-900'
                                    : 'font-medium text-slate-400 text-[11px]'
                                }
                              >
                                {part}
                              </span>
                              {!isLast && <span className="text-slate-300 text-[10px] font-bold">›</span>}
                            </React.Fragment>
                          );
                        })}
                      </span>
                    ) : (
                      <span className={isSelected ? 'font-bold' : ''}>{option.label}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
};
