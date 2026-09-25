'use client';

import React from 'react';
import { useGroupShopping } from '@/context/GroupShoppingContext';

export default function GroupShoppingBanner() {
  const { activeSession, setIsGroupModalOpen, memberPresences, activeMember } = useGroupShopping();

  if (!activeSession) return null;

  const activeBrowsers = (memberPresences || []).filter((p) => p.isHovering && p.memberId !== activeMember?.id);

  return (
    <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-medium z-40 relative gap-2">
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <div className="flex items-center space-x-2 truncate">
          <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-none">{activeSession.title}</span>
          <span className="hidden sm:inline-block bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-700">
            Code: {activeSession.code}
          </span>
          <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
            {activeSession.members.length} Member{activeSession.members.length > 1 ? 's' : ''}
          </span>
          {activeBrowsers.length > 0 && (
            <span className="hidden md:inline-flex items-center gap-1.5 bg-indigo-600/40 text-indigo-200 border border-indigo-500/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {activeBrowsers[0].memberName} inspecting products
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={() => setIsGroupModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2.5 sm:px-3 py-1 rounded-lg text-xs transition-colors shrink-0"
        >
          Manage Party
        </button>
      </div>
    </div>
  );
}
