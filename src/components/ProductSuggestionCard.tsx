'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GroupChatMessage, useGroupShopping, GroupMember } from '@/context/GroupShoppingContext';

interface ProductSuggestionCardProps {
  message: GroupChatMessage;
}

interface PollOption {
  code: string;
  label: string;
  emoji: string;
  colorClass: string;
  bgFillClass: string;
  borderClass: string;
  textClass: string;
}

const POLL_OPTIONS: PollOption[] = [
  {
    code: 'BUY',
    label: 'Yes, buy it!',
    emoji: '🛍️',
    colorClass: 'bg-emerald-500',
    bgFillClass: 'bg-emerald-50 text-emerald-900',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-700',
  },
  {
    code: 'MAYBE',
    label: 'Maybe / Need info',
    emoji: '💭',
    colorClass: 'bg-amber-500',
    bgFillClass: 'bg-amber-50 text-amber-900',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
  },
  {
    code: 'PASS',
    label: 'No, pass on this',
    emoji: '❌',
    colorClass: 'bg-rose-500',
    bgFillClass: 'bg-rose-50 text-rose-900',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
  },
];

export function ProductSuggestionCard({ message }: ProductSuggestionCardProps) {
  const { activeMember, toggleVote, addItemToGroup, isItemInGroupCart, activeSession, askGenie } = useGroupShopping();

  const renderContentWithPills = (content: string) => {
    const pillRegex = /\[\s*([^\]]+?)\s*\]/g;
    const pills: { rawLabel: string; query: string }[] = [];
    let match;

    while ((match = pillRegex.exec(content)) !== null) {
      const rawLabel = match[1];
      const categoryQuery = rawLabel.replace(/[^\w\s&]/gi, '').trim();
      pills.push({ rawLabel, query: categoryQuery });
    }

    const cleanText = content.replace(/\[\s*[^\]]+?\s*\]/g, '').trim();

    return (
      <div className="space-y-2 font-sans">
        {cleanText && (
          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap break-words leading-relaxed">
            {cleanText}
          </p>
        )}
        {pills.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
              <span>👇 Explore another category:</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {pills.map((p, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    if (typeof window !== 'undefined') {
                      let cleanedQuery = p.query;
                      if (/skincare/i.test(cleanedQuery)) cleanedQuery = 'skincare';
                      else if (/clothes|fashion/i.test(cleanedQuery)) cleanedQuery = 'clothes';
                      else if (/jewelry|accessory/i.test(cleanedQuery)) cleanedQuery = 'jewelry';
                      else if (/appliance|tech/i.test(cleanedQuery)) cleanedQuery = 'appliances';

                      const url = new URL(window.location.href);
                      url.searchParams.set('query', cleanedQuery);
                      window.history.pushState({}, '', url.toString());
                      window.dispatchEvent(new CustomEvent('shopora_search_sync', { detail: { query: cleanedQuery } }));
                    }
                    await askGenie(`suggest ${p.query} gifts`);
                  }}
                  className="flex items-center justify-center text-center px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-xs hover:shadow transition-all duration-200 cursor-pointer active:scale-95"
                >
                  {p.rawLabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [localVotes, setLocalVotes] = useState<Record<string, string> | null>(null);

  const product = message.product;
  if (!product) return null;

  const votes: Record<string, string> = localVotes || message.votes || {};
  const voteEntries = Object.entries(votes);
  const totalVotes = voteEntries.length;

  // Determine current member's vote with legacy fallback mapping
  const savedMemberId = typeof window !== 'undefined' ? localStorage.getItem(`shopora_group_member_${activeSession?.code}`) : null;
  const effectiveMemberId = activeMember?.id || savedMemberId || activeSession?.members?.[0]?.id;

  let rawMyVote = effectiveMemberId ? votes[effectiveMemberId] : null;
  if (rawMyVote === 'YES' || rawMyVote === 'LOVE') rawMyVote = 'BUY';
  if (rawMyVote === 'NO') rawMyVote = 'PASS';
  const myVote = rawMyVote;

  // Check if current user is author
  const isAuthor =
    activeMember &&
    (activeMember.id === message.senderId || activeMember.id === message.sender?.id);

  // Helper to resolve voter members for an option
  const getVotersForOption = (optionCode: string) => {
    return voteEntries
      .filter(([_, v]) => {
        if (optionCode === 'BUY' && (v === 'YES' || v === 'LOVE' || v === 'BUY')) return true;
        if (optionCode === 'PASS' && (v === 'NO' || v === 'PASS')) return true;
        return v === optionCode;
      })
      .map(([mId]) => {
        const member = activeSession?.members?.find((m) => m.id === mId);
        return {
          id: mId,
          name: member?.user?.name || member?.guestName || 'Member',
          isMe: effectiveMemberId === mId,
        };
      });
  };

  const handleVote = async (optionCode: string) => {
    if (!effectiveMemberId) return;

    const nextVotes = { ...votes };
    if (nextVotes[effectiveMemberId] === optionCode) {
      delete nextVotes[effectiveMemberId];
    } else {
      nextVotes[effectiveMemberId] = optionCode;
    }
    setLocalVotes(nextVotes);

    await toggleVote(message.id, optionCode);
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    const success = await addItemToGroup(product.id, 1);
    setIsAdding(false);
    if (success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all my-2 space-y-3 font-sans">
      {/* Header / Sender Tag */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <span
          className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
            message.sender.guestName?.includes('Genie') || message.sender.guestEmail === 'genie@shopora.ai'
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-xs animate-pulse'
              : 'bg-indigo-50 text-indigo-700'
          }`}
        >
          {message.sender.guestName?.includes('Genie') || message.sender.guestEmail === 'genie@shopora.ai'
            ? '🧞‍♂️ Shopora Genie AI Pick'
            : `✨ Suggested by ${isAuthor ? 'You' : message.sender.user?.name || message.sender.guestName}`}
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {message.content && renderContentWithPills(message.content)}

      {/* Product Card Snippet */}
      <div className="flex gap-3 items-center bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900 truncate" title={product.title}>
            {product.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-extrabold text-indigo-600">
              ${product.price.toFixed(2)}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                product.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>
      </div>

      {/* WhatsApp Group Poll Container */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2.5">
        {/* Poll Header & Question */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">📊</span>
            <h5 className="text-xs font-extrabold text-slate-800">Should we buy this item?</h5>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        {/* WhatsApp Poll Option List */}
        <div className="space-y-2">
          {POLL_OPTIONS.map((opt) => {
            const voters = getVotersForOption(opt.code);
            const voteCount = voters.length;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = myVote === opt.code;

            return (
              <div
                key={opt.code}
                onClick={() => handleVote(opt.code)}
                className={`group relative overflow-hidden rounded-xl border transition-all cursor-pointer p-2.5 ${
                  isSelected
                    ? `${opt.borderClass} ${opt.bgFillClass} ring-2 ring-indigo-400 shadow-xs`
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                {/* Poll Option Animated Background Fill Progress Bar */}
                {voteCount > 0 && (
                  <div
                    className={`absolute inset-y-0 left-0 ${opt.colorClass} opacity-15 transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-between">
                  {/* Left: Check / Radio Circle + Option Label */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? `${opt.colorClass} border-transparent text-white`
                          : 'border-slate-300 group-hover:border-indigo-500'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span>{opt.emoji}</span>
                      <span className="truncate">{opt.label}</span>
                    </span>
                  </div>

                  {/* Right: Vote Count & Percentage Badge */}
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold flex-shrink-0">
                    {voteCount > 0 && (
                      <span className="text-slate-500 text-[10px]">
                        {percentage}%
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        voteCount > 0
                          ? `${opt.colorClass} text-white`
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {voteCount}
                    </span>
                  </div>
                </div>

                {/* Voted Members Avatars / Pills */}
                {voters.length > 0 && (
                  <div className="relative z-10 flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-slate-200/60">
                    {voters.map((voter) => (
                      <span
                        key={voter.id}
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                          voter.isMe
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[8px] font-extrabold">
                          {voter.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{voter.isMe ? 'You' : voter.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: View Detail & Add to Group Cart */}
      <div className="flex items-center gap-2">
        <Link
          href={`/products/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center justify-center gap-1.5 hover:shadow-xs"
          title="View full product details in new tab"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View Detail</span>
        </Link>

        {isItemInGroupCart(product.id) ? (
          <div className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>In Cart</span>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock <= 0}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              addedSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {addedSuccess ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
