'use client';

import React from 'react';

export interface ShoporaLogoProps {
  /**
   * Layout variant:
   * - 'full': Icon mark + Brand title + Subtext badge
   * - 'icon': SVG Icon mark only
   * - 'horizontal': Compact horizontal icon + title
   * - 'vertical': Centered stacked icon + title
   */
  variant?: 'full' | 'icon' | 'horizontal' | 'vertical';
  /**
   * Pre-set size scale for icon/logo: 'sm' | 'md' | 'lg' | 'xl'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom subtext or badge label (e.g., "Marketplace", "Super Admin", "Merchant Store")
   */
  subtext?: string;
  /**
   * Additional Tailwind / CSS class names for outer container
   */
  className?: string;
  /**
   * Optional custom click handler
   */
  onClick?: () => void;
}

export const ShoporaLogo: React.FC<ShoporaLogoProps> = ({
  variant = 'full',
  size = 'md',
  subtext = 'Marketplace',
  className = '',
  onClick,
}) => {
  // Dimensions scaling map
  const sizeMap = {
    sm: { icon: 32, title: 'text-base', sub: 'text-[9px]', badge: 'text-[9px] px-1.5 py-0.2' },
    md: { icon: 40, title: 'text-xl', sub: 'text-[10px]', badge: 'text-[10px] px-2 py-0.5' },
    lg: { icon: 48, title: 'text-2xl', sub: 'text-xs', badge: 'text-xs px-2.5 py-0.5' },
    xl: { icon: 64, title: 'text-3xl', sub: 'text-sm', badge: 'text-xs px-3 py-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Render SVG Icon Mark
  const renderIconMark = () => (
    <div
      className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
      style={{ width: currentSize.icon, height: currentSize.icon }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Main Gradient Outer Box */}
          <linearGradient id="shopora-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>

          {/* Inner Accent Ribbon Gradient */}
          <linearGradient id="shopora-ribbon-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>

          <linearGradient id="shopora-ribbon-2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>

          {/* Shadow Filter */}
          <filter id="shopora-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4F46E5" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Rounded Container Box */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="24"
          fill="url(#shopora-bg-grad)"
          filter="url(#shopora-glow)"
        />

        {/* Shopping Bag Handles Ribbon (Top Arch) */}
        <path
          d="M38 34 C38 24, 62 24, 62 34"
          stroke="url(#shopora-ribbon-1)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Stylized 'S' Mark + Shopping Bag Body Geometry */}
        {/* Top Loop of S */}
        <path
          d="M64 42 C64 36, 42 34, 38 44 C34 54, 66 52, 62 64 C58 74, 36 70, 36 64"
          stroke="url(#shopora-ribbon-1)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Sparkle Accent Dot Top Right */}
        <path
          d="M72 24 L74 29 L79 31 L74 33 L72 38 L70 33 L65 31 L70 29 Z"
          fill="#FDE047"
        />

        {/* Sparkle Accent Bottom Left */}
        <circle cx="26" cy="68" r="3" fill="#38BDF8" />
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center group cursor-pointer ${className}`} onClick={onClick}>
        {renderIconMark()}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 group cursor-pointer select-none ${variant === 'vertical' ? 'flex-col text-center' : 'flex-row'
        } ${className}`}
      onClick={onClick}
    >
      {renderIconMark()}

      <div className={variant === 'vertical' ? 'items-center' : 'text-left'}>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`${currentSize.title} font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors`}>
            Shopora
          </span>

          {/* {subtext && (
            <span
              className={`${currentSize.badge} rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/90 font-extrabold tracking-normal shadow-2xs inline-block`}
            >
              {subtext}
            </span>
          )} */}
        </div>

        <p className={`${currentSize.sub} text-slate-500 font-semibold tracking-wide uppercase mt-0.5`}>
          Premier Global Marketplace
        </p>
      </div>
    </div>
  );
};
