'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRY_CODES, CountryCode, DEFAULT_COUNTRY, parsePhoneNumber } from '@/lib/countryCodes';

export interface PhoneInputProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value = '',
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with incoming value from parent
  useEffect(() => {
    const { country, nationalNumber: parsedNum } = parsePhoneNumber(value);
    setSelectedCountry(country);
    setNationalNumber(parsedNum);
  }, [value]);

  // Handle outside click to close dropdown popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    
    // Notify parent of updated full phone number
    const formatted = nationalNumber.trim() ? `${country.dialCode} ${nationalNumber.trim()}` : '';
    onChange(formatted);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    // Allow digits, spaces, and hyphens for phone formatting
    const cleaned = inputVal.replace(/[^\d\s-]/g, '');
    setNationalNumber(cleaned);

    const formatted = cleaned.trim() ? `${selectedCountry.dialCode} ${cleaned.trim()}` : '';
    onChange(formatted);
  };

  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label}
          {required && <span className="text-rose-500 font-extrabold ml-1">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center bg-slate-50 rounded-xl border transition-all shadow-2xs ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100/80' : ''
        } ${
          error
            ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
            : 'border-slate-200 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20'
        }`}
      >
        {/* Country Selector Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center pl-3 pr-1.5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors shrink-0 rounded-l-xl focus:outline-none"
          title={`Select Country Code (Current: ${selectedCountry.name} ${selectedCountry.dialCode})`}
        >
          <span className="text-lg leading-none mr-1.5 select-none">{selectedCountry.flag}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </button>

        {/* Vertical Divider Line (as seen in second screenshot) */}
        <div className="w-px h-6 bg-slate-200/90 mx-1.5 shrink-0" />

        {/* Phone Input Field */}
        <input
          id={id}
          name={name}
          type="tel"
          disabled={disabled}
          required={required}
          value={nationalNumber}
          onChange={handleInputChange}
          placeholder={placeholder || selectedCountry.placeholder || 'Enter Contact Number'}
          className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-medium py-2.5 pr-3.5 focus:outline-none"
        />

        {/* Country Popover Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input inside Dropdown */}
            <div className="relative mb-2 px-1 pt-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full bg-slate-50 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors font-medium"
              />
            </div>

            {/* Country List */}
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="text-[11px] font-mono text-slate-500 font-bold">
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No country found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-500 mt-1 animate-in fade-in">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-500 font-medium mt-1">{helperText}</p>}
    </div>
  );
};
