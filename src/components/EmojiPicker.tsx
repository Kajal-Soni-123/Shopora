'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '🚀', '💯', '👏', '🥳'];

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    name: 'Popular',
    icon: '⭐',
    emojis: QUICK_EMOJIS,
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
      '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
      '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '🤬', '😈', '👿', '💀',
      '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    ],
  },
  {
    id: 'gestures',
    name: 'Hands & Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
      '💅', '🤳', '💪', '🦾', '🦿', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐',
      '🖖', '👋', '🤙', '🖐️', '🖕', '🤏',
    ],
  },
  {
    id: 'celebration',
    name: 'Celebration & Hearts',
    icon: '🔥',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '🎆', '🎇', '✨', '🌟', '💫', '💥', '🔥', '💯',
      '🏆', '🥇', '👑', '💎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping & Stuff',
    icon: '🛍️',
    emojis: [
      '🛍️', '🛒', '💳', '💰', '💵', '📦', '🏷️', '👗', '👟', '🕶️', '💄', '📱', '💻',
      '⌚', '🎧', '⚡', '🌈', '🍕', '🍔', '🍟', '🍿', '🍦', '☕', '🧃', '🍾', '🥂',
    ],
  },
];

export function EmojiPicker({ onSelect, onClose, className = '' }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentCategoryObj =
    EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const displayedEmojis = searchQuery.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji, index, self) => self.indexOf(emoji) === index)
    : currentCategoryObj.emojis;

  return (
    <div
      ref={pickerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 z-50 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Quick Reaction Bar */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 overflow-x-auto no-scrollbar">
        {QUICK_EMOJIS.slice(0, 7).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose?.();
            }}
            className="text-lg p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 hover:scale-125 transition-all cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter emojis..."
          className="w-full text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
        />
      </div>

      {/* Category Tabs */}
      {!searchQuery.trim() && (
        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`p-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold scale-110'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 opacity-70 hover:opacity-100'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="max-h-44 overflow-y-auto grid grid-cols-7 gap-1 p-1 no-scrollbar">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose?.();
            }}
            className="text-xl p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 hover:scale-125 transition-all flex items-center justify-center cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
