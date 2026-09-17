// Utility for mapping color names to CSS color hex codes / gradients

const COLOR_MAP: Record<string, string> = {
  black: '#0f172a',
  white: '#ffffff',
  red: '#ef4444',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  'navy blue': '#1e3a8a',
  'royal blue': '#2563eb',
  sky: '#38bdf8',
  'sky blue': '#38bdf8',
  green: '#22c55e',
  emerald: '#10b981',
  olive: '#65a30d',
  'olive green': '#65a30d',
  mint: '#6ee7b7',
  yellow: '#eab308',
  gold: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%)',
  amber: '#f59e0b',
  orange: '#f97316',
  purple: '#a855f7',
  violet: '#8b5cf6',
  indigo: '#6366f1',
  pink: '#ec4899',
  rose: '#f43f5e',
  'rose gold': 'linear-gradient(135deg, #b76e79 0%, #ffd1dc 50%, #b76e79 100%)',
  coral: '#fb7185',
  grey: '#64748b',
  gray: '#64748b',
  'slate gray': '#475569',
  'space gray': '#334155',
  silver: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #cbd5e1 100%)',
  bronze: '#9a3412',
  beige: '#f5f5dc',
  cream: '#fffdd0',
  tan: '#d2b48c',
  brown: '#78350f',
  chocolate: '#451a03',
  charcoal: '#1e293b',
  midnight: '#020617',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  magenta: '#d946ef',
  khaki: '#c2b280',
};

export const getColorStyle = (colorName: string): { background: string; border: string } => {
  const clean = colorName.trim().toLowerCase();
  const hexOrGradient = COLOR_MAP[clean];

  if (hexOrGradient) {
    if (hexOrGradient.startsWith('linear-gradient')) {
      return { background: hexOrGradient, border: 'border-slate-300' };
    }
    return {
      background: hexOrGradient,
      border: clean === 'white' || clean === 'cream' || clean === 'beige' ? 'border-slate-300' : 'border-transparent',
    };
  }

  // Fallback hashing for unknown custom color names
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return {
    background: `hsl(${h}, 65%, 55%)`,
    border: 'border-transparent',
  };
};

export const COMMON_PRESET_COLORS = [
  'Black',
  'White',
  'Space Gray',
  'Silver',
  'Gold',
  'Rose Gold',
  'Navy Blue',
  'Royal Blue',
  'Crimson Red',
  'Emerald Green',
  'Olive Green',
  'Midnight',
  'Beige',
  'Brown',
];
