'use client';

import React, { useState } from 'react';
import { X, Plus, Palette, Check } from 'lucide-react';
import { getColorStyle } from '@/lib/color-utils';

export interface ColorOption {
  name: string;
  hex?: string;
}

const PALETTE_PRESETS: ColorOption[] = [
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Olive Green', hex: '#65a30d' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Silver', hex: '#94a3b8' },
  { name: 'Rose Gold', hex: '#b76e79' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Space Gray', hex: '#334155' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Teal', hex: '#14b8a6' },
];

interface ColorPalettePickerProps {
  label?: string;
  required?: boolean;
  selectedColors: string[];
  onChange: (colors: string[]) => void;
  error?: string;
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  label = 'Product Colors & Finishes',
  required = false,
  selectedColors = [],
  onChange,
  error,
}) => {
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#3b82f6');

  const handleToggleColor = (colorName: string) => {
    if (selectedColors.includes(colorName)) {
      onChange(selectedColors.filter((c) => c !== colorName));
    } else {
      onChange([...selectedColors, colorName]);
    }
  };

  const handleRemoveColor = (colorName: string) => {
    onChange(selectedColors.filter((c) => c !== colorName));
  };

  const handleAddCustomColor = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = customColorName.trim();
    if (!trimmed) return;
    if (!selectedColors.includes(trimmed)) {
      onChange([...selectedColors, trimmed]);
    }
    setCustomColorName('');
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-indigo-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-extrabold">*</span>}
        </label>
        <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          {selectedColors.length} Selected
        </span>
      </div>

      {/* 1. SELECTED COLORS PILLBOX */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 min-h-[52px] space-y-1.5">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
          Selected Color Pillbox (Click ✕ to remove)
        </span>

        {selectedColors.length === 0 ? (
          <p className="text-xs text-slate-400 italic pt-1">
            No color variants selected yet. Pick from the palette below or enter a custom color.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {selectedColors.map((colorName) => {
              const style = getColorStyle(colorName);
              return (
                <span
                  key={colorName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-xs hover:border-slate-300 transition-all"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border shadow-inner flex-shrink-0 ${style.border}`}
                    style={{ background: style.background }}
                  />
                  <span>{colorName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(colorName)}
                    className="ml-1 text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded-md hover:bg-rose-50"
                    title={`Remove ${colorName}`}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. VISUAL COLOR PALETTE GRID */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
          Visual Color Palette (Click to select/unselect)
        </span>

        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 pt-1">
          {PALETTE_PRESETS.map((preset) => {
            const isSelected = selectedColors.includes(preset.name);
            const style = getColorStyle(preset.name);
            const isWhite = preset.name === 'White';

            return (
              <button
                type="button"
                key={preset.name}
                onClick={() => handleToggleColor(preset.name)}
                title={`${preset.name} ${isSelected ? '(Selected)' : ''}`}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 scale-105 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full border shadow-xs flex items-center justify-center transition-transform group-hover:scale-110 ${style.border}`}
                  style={{ background: style.background }}
                >
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isWhite ? 'text-slate-900' : 'text-white'}`} />
                  )}
                </div>
                <span className="text-[9px] font-bold text-slate-600 truncate max-w-full mt-1">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CUSTOM COLOR ADDER (COLOR PICKER + TEXT INPUT) */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Color Picker:</label>
          <input
            type="color"
            value={customColorHex}
            onChange={(e) => {
              setCustomColorHex(e.target.value);
            }}
            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0 bg-transparent flex-shrink-0"
            title="Choose hex color"
          />
        </div>

        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleAddCustomColor(e);
              }
            }}
            placeholder="e.g. Electric Teal, Matte Black..."
            className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-slate-800"
          />
          <button
            type="button"
            onClick={handleAddCustomColor}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Color
          </button>
        </div>
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-500 mt-1">{error}</p>}
    </div>
  );
};
