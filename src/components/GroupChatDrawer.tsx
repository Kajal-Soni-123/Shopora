'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useGroupShopping, GroupChatMessage } from '@/context/GroupShoppingContext';
import { ProductSuggestionCard } from './ProductSuggestionCard';
import { EmojiPicker } from './EmojiPicker';

export function GroupChatDrawer() {
  const {
    activeSession,
    activeMember,
    isHost,
    isChatDrawerOpen,
    setIsChatDrawerOpen,
    messages,
    unreadCount,
    resetUnreadCount,
    sendMessage,
    deleteMessage,
    toggleReaction,
    fetchSuggestedUsers,
    sendInviteEmails,
    askGenie,
    isGenieThinking,
  } = useGroupShopping();

  const [activeTab, setActiveTab] = useState<'CHAT' | 'MEMBERS'>('CHAT');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>>([]);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [invitingEmails, setInvitingEmails] = useState<Record<string, boolean>>({});

  // WhatsApp interaction states
  const [replyTargetMessage, setReplyTargetMessage] = useState<GroupChatMessage | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom of chat feed when new messages arrive or drawer opens
  useEffect(() => {
    if (isChatDrawerOpen) {
      resetUnreadCount();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isChatDrawerOpen, messages.length]);

  // Click outside to dismiss open menus
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch user suggestions for inviting from chat drawer
  useEffect(() => {
    if (activeTab === 'MEMBERS' && activeSession?.code) {
      setLoadingSuggestions(true);
      fetchSuggestedUsers(activeSession.code, suggestQuery)
        .then((res) => {
          if (res.success) {
            setSuggestedUsers(res.suggestions);
          }
        })
        .finally(() => setLoadingSuggestions(false));
    }
  }, [activeTab, activeSession?.code, suggestQuery]);

  const handleChatInviteUser = async (email: string, name?: string) => {
    if (invitingEmails[email]) return;
    setInvitingEmails((prev) => ({ ...prev, [email]: true }));
    const result = await sendInviteEmails([email]);
    setInvitingEmails((prev) => ({ ...prev, [email]: false }));

    if (result.success) {
      setCopyToast(`Invite sent to ${name || email}! 🎉`);
      setSuggestedUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
      setTimeout(() => setCopyToast(null), 3000);
    } else {
      setCopyToast(result.error || 'Failed to send invite.');
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  if (!activeSession) return null;

  // WhatsApp Scroll to original quoted message with glow highlight
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-bubble-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(messageId);
      setTimeout(() => setHighlightedMsgId(null), 1800);
    }
  };

  // Automatic intent detection for natural shopping queries
  const isShoppingQuery = (text: string) => {
    const lower = text.toLowerCase().trim();
    return (
      lower.startsWith('@genie') ||
      lower.startsWith('genie') ||
      /^(recommend|suggest|find|show me|looking for|search|cheapest|best rated|deals under|items under|\$)/i.test(lower) ||
      /\b(under \$|less than \$|below \$|which one should|what is the best)\b/i.test(lower)
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const replyId = replyTargetMessage?.id;
    setIsSending(true);
    setReplyTargetMessage(null); // Clear preview immediately

    const trimmed = inputText.trim();
    let success = false;

    // Smart Auto-Routing: If query matches shopping intent or starts with @genie, route to Genie AI!
    if (isShoppingQuery(trimmed)) {
      const result = await askGenie(trimmed);
      success = result.success;
    } else {
      success = await sendMessage(trimmed, replyId);
    }

    setIsSending(false);

    if (success) {
      setInputText('');
    }
  };

  const triggerMainPageSearch = (rawPrompt: string) => {
    if (typeof window === 'undefined') return;
    let cleanedQuery = rawPrompt
      .replace(/^suggest\s+/i, '')
      .replace(/gifts?|products?|items?/gi, '')
      .trim();

    // Map common category pill queries to clean catalog search terms
    if (/skincare/i.test(cleanedQuery)) cleanedQuery = 'skincare';
    else if (/clothes|fashion|wear|apparel/i.test(cleanedQuery)) cleanedQuery = 'clothes';
    else if (/jewelry|accessory|accessories/i.test(cleanedQuery)) cleanedQuery = 'jewelry';
    else if (/appliance|tech|gadget/i.test(cleanedQuery)) cleanedQuery = 'appliances';

    if (cleanedQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set('query', cleanedQuery);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new CustomEvent('shopora_search_sync', { detail: { query: cleanedQuery } }));
    }
  };

  const handleAskGenieDirect = async () => {
    if (!inputText.trim()) return;
    setIsSending(true);
    setReplyTargetMessage(null);
    // Note: Do not trigger main page search on raw typed text prompt to prevent clearing catalog grid
    const result = await askGenie(inputText.trim());
    setIsSending(false);
    if (result.success) {
      setInputText('');
    }
  };

  const handleQuickGenie = async (prompt: string) => {
    setIsSending(true);
    // Trigger main page search grid update ONLY when clicking category pillbox
    triggerMainPageSearch(prompt);
    await askGenie(prompt);
    setIsSending(false);
  };

  // Interactive Category Option Pillbox Renderer for Chat Bubbles
  const renderMessageContentWithPills = (content: string) => {
    const pillRegex = /\[\s*([^\]]+?)\s*\]/g;
    const pills: { rawLabel: string; query: string }[] = [];
    let match;

    while ((match = pillRegex.exec(content)) !== null) {
      const rawLabel = match[1];
      const categoryQuery = rawLabel.replace(/[^\w\s&]/gi, '').trim();
      pills.push({ rawLabel, query: categoryQuery });
    }

    const cleanText = content.replace(/\[\s*[^\]]+?\s*\]/g, '').trim();

    if (pills.length === 0) {
      return <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>;
    }

    return (
      <div className="space-y-2.5 my-1 font-sans">
        <p className="whitespace-pre-wrap break-words leading-relaxed font-medium text-xs">{cleanText}</p>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100/80">
          {pills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickGenie(`suggest ${pill.query} gifts`);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 shadow-2xs hover:shadow-md transition-all cursor-pointer text-center active:scale-95"
              title={`View ${pill.query} gift suggestions`}
            >
              <span className="truncate">{pill.rawLabel}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Mobile / Touch long-press handlers
  const handleTouchStart = (msgId: string) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveActionMenuId(msgId);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉', '😂', '😮'];

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-40 font-sans">
      {/* Toast Feedback */}
      {copyToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xl animate-fadeIn flex items-center gap-2">
          <span>📋</span>
          <span>{copyToast}</span>
        </div>
      )}

      {/* Collapsed Pill Floating Button */}
      {!isChatDrawerOpen ? (
        <button
          onClick={() => setIsChatDrawerOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-2xl flex items-center gap-2.5 sm:gap-3 transition-all duration-300 hover:scale-105 ring-4 ring-indigo-100"
        >
          <div className="relative">
            <span className="text-base sm:text-lg">💬</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight">Group Chat & Suggestions</div>
            <div className="text-[10px] text-indigo-200">
              {activeSession.members.length} members online
            </div>
          </div>
          <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      ) : (
        /* Expanded Drawer Container */
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[calc(100vw-1rem)] max-w-sm sm:w-96 h-[80vh] max-h-[560px] flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-indigo-600 p-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-indigo-500/50 rounded-lg text-sm">💬</span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold truncate">{activeSession.title}</h3>
                <p className="text-[10px] text-indigo-200 truncate">
                  Code: <span className="font-mono font-bold text-white">{activeSession.code}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsChatDrawerOpen(false)}
                className="p-1 hover:bg-indigo-500/50 rounded-lg text-indigo-100 hover:text-white transition-colors"
                title="Minimize Chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setActiveTab('CHAT')}
              className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                activeTab === 'CHAT'
                  ? 'border-indigo-600 text-indigo-600 font-bold bg-white'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              Chat & Suggestions ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`flex-1 py-2 text-center transition-colors border-b-2 ${
                activeTab === 'MEMBERS'
                  ? 'border-indigo-600 text-indigo-600 font-bold bg-white'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              Members ({activeSession.members.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'CHAT' ? (
            <>
              {/* Messages Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                    <span className="text-3xl">🛍️</span>
                    <p className="text-xs font-medium">No messages yet!</p>
                    <p className="text-[11px] text-slate-400">
                      Start chatting or click &ldquo;Suggest to Group&rdquo; on any product card.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = activeMember?.id === msg.senderId;

                    if (msg.type === 'PRODUCT_SUGGESTION') {
                      return (
                        <div
                          id={`msg-bubble-${msg.id}`}
                          key={msg.id}
                          className={`transition-all rounded-2xl ${
                            highlightedMsgId === msg.id ? 'ring-2 ring-indigo-500 bg-indigo-50 p-1' : ''
                          }`}
                        >
                          <ProductSuggestionCard message={msg} />
                        </div>
                      );
                    }

                    if (msg.type === 'SYSTEM_EVENT') {
                      return (
                        <div key={msg.id} className="text-center my-1">
                          <span className="text-[10px] text-slate-500 bg-slate-200/60 px-2.5 py-0.5 rounded-full">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    const reactions: Record<string, string> = msg.reactions || {};
                    const reactionEntries = Object.entries(reactions);
                    const userReaction = activeMember ? reactions[activeMember.id] : null;

                    // Group unique reactions & counts
                    const emojiCounts: Record<string, number> = {};
                    reactionEntries.forEach(([, emoji]) => {
                      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
                    });

                    // Quoted message resolution
                    const repliedMsg =
                      msg.replyToMessage || (msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null);

                    const senderName = msg.sender.user?.name || msg.sender.guestName;

                    return (
                      <div
                        id={`msg-bubble-${msg.id}`}
                        key={msg.id}
                        onTouchStart={() => handleTouchStart(msg.id)}
                        onTouchEnd={handleTouchEnd}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5 relative group ${
                          highlightedMsgId === msg.id ? 'animate-pulse' : ''
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                          {senderName}
                        </span>

                        {/* WhatsApp Message Bubble Container */}
                        <div
                          className={`max-w-[85%] p-2.5 rounded-2xl text-xs shadow-xs relative transition-all duration-300 ${
                            highlightedMsgId === msg.id
                              ? 'ring-2 ring-indigo-500 bg-amber-100 text-slate-900'
                              : isMe
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
                          }`}
                        >
                          {/* Desktop Hover Chevron Action Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === msg.id ? null : msg.id);
                            }}
                            className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-full ${
                              isMe ? 'bg-black/20 text-white hover:bg-black/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            } transition-opacity z-20 cursor-pointer ${
                              activeActionMenuId === msg.id ? 'opacity-100' : ''
                            }`}
                            title="Message actions"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* WhatsApp Quoted Reply Block inside Bubble */}
                          {repliedMsg && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScrollToMessage(repliedMsg.id);
                              }}
                              className={`mb-2 p-2 rounded-xl text-[11px] cursor-pointer transition-all border-l-4 ${
                                isMe
                                  ? 'bg-black/15 text-indigo-100 border-indigo-300 hover:bg-black/25'
                                  : 'bg-indigo-50/80 text-slate-800 border-indigo-600 hover:bg-indigo-100'
                              }`}
                            >
                              <div className="font-extrabold text-[10px] text-indigo-300 dark:text-indigo-600 line-clamp-1">
                                {repliedMsg.sender?.user?.name || repliedMsg.sender?.guestName || 'Member'}
                              </div>
                              <div className="line-clamp-2 opacity-90 font-medium">
                                {repliedMsg.type === 'PRODUCT_SUGGESTION'
                                  ? `🛍️ Product: ${repliedMsg.product?.title || 'Suggestion'}`
                                  : repliedMsg.content || 'Message'}
                              </div>
                            </div>
                          )}

                          {/* Message Content */}
                          <div className="whitespace-pre-wrap break-words pr-4 leading-relaxed font-normal text-xs">
                            {renderMessageContentWithPills(msg.content)}
                          </div>

                          {/* Timestamp */}
                          <div
                            className={`text-[9px] mt-1 text-right font-medium ${
                              isMe ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          {/* WhatsApp Floating Reaction Badge (Anchored on Bubble Edge) */}
                          {reactionEntries.length > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (userReaction) {
                                  toggleReaction(msg.id, userReaction);
                                }
                              }}
                              className={`absolute -bottom-3 ${
                                isMe ? 'right-2' : 'left-2'
                              } z-10 inline-flex items-center gap-1 bg-white text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-slate-200 cursor-pointer hover:scale-105 transition-transform`}
                              title={reactionEntries
                                .map(([mId, emoji]) => {
                                  const member = activeSession?.members?.find((m) => m.id === mId);
                                  return `${member?.user?.name || member?.guestName || 'Member'}: ${emoji}`;
                                })
                                .join('\n')}
                            >
                              <span className="flex items-center gap-0.5">
                                {Object.keys(emojiCounts).map((emoji) => (
                                  <span key={emoji}>{emoji}</span>
                                ))}
                              </span>
                              {reactionEntries.length > 1 && (
                                <span className="text-[9px] font-extrabold text-slate-500">
                                  {reactionEntries.length}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Contextual Action Dropdown Menu */}
                          {activeActionMenuId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute z-30 top-7 ${
                                isMe ? 'right-0' : 'left-0'
                              } w-36 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 animate-fadeIn`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTargetMessage(msg);
                                  setActiveActionMenuId(null);
                                  setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                              >
                                <span className="text-sm">↩️</span>
                                <span>Reply</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActivePickerMsgId(activePickerMsgId === msg.id ? null : msg.id);
                                  setActiveActionMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                              >
                                <span className="text-sm">😄</span>
                                <span>React</span>
                              </button>

                              {msg.content && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content || '');
                                    setCopyToast('Copied to clipboard');
                                    setTimeout(() => setCopyToast(null), 2000);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100 flex items-center gap-2.5 transition-colors"
                                >
                                  <span className="text-sm">📋</span>
                                  <span>Copy text</span>
                                </button>
                              )}

                              {(isMe || isHost) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteMessage(msg.id);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 border-t border-slate-100 transition-colors"
                                >
                                  <span className="text-sm">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* WhatsApp Quick Reaction Bar & Emoji Picker Trigger */}
                        {activePickerMsgId === msg.id && (
                          <div className={`mt-1 flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-full shadow-lg border border-slate-200 z-30 animate-fadeIn ${isMe ? 'self-end' : 'self-start'}`}>
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  toggleReaction(msg.id, emoji);
                                  setActivePickerMsgId(null);
                                }}
                                className="hover:scale-130 transition-transform p-0.5 cursor-pointer"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Shopora Genie AI Searching/Thinking Indicator */}
                {isGenieThinking && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-md animate-pulse my-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base font-bold">
                      🧞‍♂️
                    </div>
                    <div className="text-xs min-w-0">
                      <p className="font-bold flex items-center gap-1">
                        <span>Shopora Genie is searching...</span>
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">AI</span>
                      </p>
                      <p className="text-[10px] text-indigo-200 truncate">Finding the best matches & catalog deals for your party ✨</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer with WhatsApp Reply Preview Banner */}
              <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-100 space-y-2">

                {/* WhatsApp Reply Preview Banner directly above input */}
                {replyTargetMessage && (
                  <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl border-l-4 border-indigo-600 animate-slide-up">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-extrabold text-indigo-600 block uppercase tracking-wider">
                        Replying to {replyTargetMessage.sender.user?.name || replyTargetMessage.sender.guestName}
                      </span>
                      <p className="text-xs text-slate-700 truncate font-medium">
                        {replyTargetMessage.type === 'PRODUCT_SUGGESTION'
                          ? `🛍️ Product: ${replyTargetMessage.product?.title || 'Suggestion'}`
                          : replyTargetMessage.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyTargetMessage(null)}
                      className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      title="Cancel reply"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      replyTargetMessage
                        ? `Reply to ${replyTargetMessage.sender.user?.name || replyTargetMessage.sender.guestName}...`
                        : 'Ask Genie e.g. "shoes under $50" or chat...'
                    }
                    className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 min-w-0"
                  />

                  {/* Dedicated Ask Genie AI Button */}
                  <button
                    type="button"
                    onClick={handleAskGenieDirect}
                    disabled={isSending || isGenieThinking || !inputText.trim()}
                    title="Ask Shopora Genie AI for product recommendations"
                    className="py-2.5 px-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>✨ Ask Genie</span>
                  </button>

                  {/* Regular Chat Send Button */}
                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    title="Send chat message"
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Members List Tab */
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {/* Group Members List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Party Members ({activeSession.members.length})
                </h4>
                {activeSession.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 flex-shrink-0">
                        {(member.user?.name || member.guestName).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {member.user?.name || member.guestName}
                          {activeMember?.id === member.id && ' (You)'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {member.role === 'HOST' ? '👑 Group Host' : member.status === 'INVITED' ? '✉️ Invited' : 'Member'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                ))}
              </div>

              {/* Suggested Users to Invite Section */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>✨</span>
                    <span>Suggest Friends to Invite</span>
                  </h4>
                  {loadingSuggestions && (
                    <span className="text-[10px] text-indigo-500 animate-pulse">Loading...</span>
                  )}
                </div>

                {/* Filter Search Bar */}
                <input
                  type="text"
                  value={suggestQuery}
                  onChange={(e) => setSuggestQuery(e.target.value)}
                  placeholder="Search registered users by name/email..."
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                />

                {/* Suggested User Cards */}
                {suggestedUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    {loadingSuggestions ? 'Searching users...' : 'No additional registered users found.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                    {suggestedUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          user.isNearby
                            ? 'bg-indigo-50/90 border-indigo-200'
                            : 'bg-white border-slate-200/90 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                              {user.isNearby && (
                                <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-extrabold rounded-full tracking-wide">
                                  NEARBY
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span>{user.email}</span>
                              {user.locationLabel && (
                                <span className="text-indigo-600 font-semibold">{user.locationLabel}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChatInviteUser(user.email, user.name)}
                          disabled={invitingEmails[user.email]}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                        >
                          <span>✉️</span>
                          <span>{invitingEmails[user.email] ? 'Sending...' : 'Invite'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
