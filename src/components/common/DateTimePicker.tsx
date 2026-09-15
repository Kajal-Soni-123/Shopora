'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

export interface DateTimePickerProps {
  label?: string;
  value: string; // ISO string format: YYYY-MM-THH:mm
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  required,
  error,
  placeholder = 'Select date & time...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial state or fallback to current date
  const parseValueToDate = (valStr: string): Date => {
    if (!valStr) return new Date();
    const d = new Date(valStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const initialDate = parseValueToDate(value);
  const [viewDate, setViewDate] = useState<Date>(new Date(initialDate));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate));

  // Time state
  const [hours, setHours] = useState<number>(initialDate.getHours());
  const [minutes, setMinutes] = useState<number>(initialDate.getMinutes());

  // Sync internal state when prop value changes
  useEffect(() => {
    if (value) {
      const parsed = parseValueToDate(value);
      setSelectedDate(parsed);
      setViewDate(new Date(parsed));
      setHours(parsed.getHours());
      setMinutes(parsed.getMinutes());
    }
  }, [value]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format datetime for display in input
  const formatDisplay = (d: Date, h: number, m: number): string => {
    if (!value) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const monthStr = MONTH_NAMES[d.getMonth()].slice(0, 3);
    const year = d.getFullYear();
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const formattedHour = String(displayHour).padStart(2, '0');
    const formattedMinute = String(m).padStart(2, '0');

    return `${day} ${monthStr} ${year}, ${formattedHour}:${formattedMinute} ${period}`;
  };

  // Convert current selectedDate + hours + minutes to ISO string format (YYYY-MM-THH:mm)
  const emitValue = (d: Date, h: number, m: number) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const formattedH = String(h).padStart(2, '0');
    const formattedM = String(m).padStart(2, '0');

    const isoStr = `${year}-${month}-${day}T${formattedH}:${formattedM}`;
    onChange(isoStr);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDateDay = (dayNum: number, isCurrentMonth: boolean, offsetMonth = 0) => {
    const targetMonth = viewDate.getMonth() + offsetMonth;
    const newD = new Date(viewDate.getFullYear(), targetMonth, dayNum);
    setSelectedDate(newD);
    emitValue(newD, hours, minutes);
  };

  const handleHoursChange = (newH: number) => {
    setHours(newH);
    emitValue(selectedDate, newH, minutes);
  };

  const handleMinutesChange = (newM: number) => {
    setMinutes(newM);
    emitValue(selectedDate, hours, newM);
  };

  // Preset Handlers
  const applyPreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setSelectedDate(target);
    setViewDate(new Date(target));
    emitValue(target, hours, minutes);
  };

  // Generate Calendar Days Grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  // Monday indexing: 0 = Mon, ..., 6 = Sun
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const gridCells: Array<{ day: number; currentMonth: boolean; offset: number }> = [];

  // Prev month cells
  for (let i = startingDay - 1; i >= 0; i--) {
    gridCells.push({ day: daysInPrevMonth - i, currentMonth: false, offset: -1 });
  }

  // Current month cells
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    gridCells.push({ day: i, currentMonth: true, offset: 0 });
  }

  // Next month cells to fill grid to 35 or 42
  const remainingCells = (7 - (gridCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({ day: i, currentMonth: false, offset: 1 });
  }

  // Check if cell is today
  const today = new Date();
  const isTodayCell = (day: number, currentMonth: boolean, offset: number) => {
    if (!currentMonth) return false;
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Check if cell is selected
  const isSelectedCell = (day: number, currentMonth: boolean, offset: number) => {
    if (!currentMonth) return false;
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  return (
    <div className={`space-y-1.5 w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-extrabold ml-1">*</span>}
        </label>
      )}

      {/* Trigger Input Bar */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full py-2.5 px-3.5 bg-slate-50 border rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all duration-150 select-none ${
          error
            ? 'border-rose-300 ring-2 ring-rose-500/10'
            : isOpen
            ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15'
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/70'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <div className="flex items-center gap-2.5 text-slate-800">
          <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          {value ? (
            <span className="font-extrabold text-slate-900">
              {formatDisplay(selectedDate, hours, minutes)}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}

      {/* Custom Theme Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-full sm:w-80 bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-900/15 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-slate-900">
                {MONTH_NAMES[month]} {year}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => applyPreset(0)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors border border-slate-200/70 whitespace-nowrap"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset(1)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors border border-slate-200/70 whitespace-nowrap"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors border border-slate-200/70 whitespace-nowrap"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors border border-slate-200/70 whitespace-nowrap"
            >
              +14 Days
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-extrabold text-slate-400 uppercase py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Date Grid */}
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((cell, idx) => {
              const selected = isSelectedCell(cell.day, cell.currentMonth, cell.offset);
              const isToday = isTodayCell(cell.day, cell.currentMonth, cell.offset);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDateDay(cell.day, cell.currentMonth, cell.offset)}
                  className={`h-8 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all duration-150 ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 scale-105'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600 font-black'
                      : cell.currentMonth
                      ? 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-600'
                      : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Styled Time Selector Section */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Time:</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Hours Dropdown */}
              <select
                value={hours}
                onChange={(e) => handleHoursChange(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer"
              >
                {Array.from({ length: 24 }).map((_, h) => {
                  const displayH = h % 12 === 0 ? 12 : h % 12;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  return (
                    <option key={h} value={h}>
                      {String(displayH).padStart(2, '0')}:00 {ampm} ({String(h).padStart(2, '0')}:00)
                    </option>
                  );
                })}
              </select>

              {/* Minutes Selector */}
              <select
                value={minutes}
                onChange={(e) => handleMinutesChange(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    :{String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Action Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSelectedDate(now);
                setViewDate(now);
                setHours(now.getHours());
                setMinutes(now.getMinutes());
                emitValue(now, now.getHours(), now.getMinutes());
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Now
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
