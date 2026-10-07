'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Send, Loader2, RotateCcw, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import { ASSISTANT_NAME } from '@/lib/assistant';
import { formatCurrency } from '@/lib/utils';

interface ChatProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  rating: number;
  note?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: ChatProduct[];
  error?: boolean;
}

const STORAGE_KEY = 'shopora_assistant_chat';

const WELCOME: ChatMessage = {
  role: 'assistant',
  text:
    `Hi! I'm ${ASSISTANT_NAME} ✨ your personal shopping assistant. I can find products, check offers, track your orders, or help you pick the perfect gift. What can I do for you?` +
    '\n\n[ 🎁 Help me find a gift ]  [ 🏷️ Any offers right now? ]  [ 📦 Where is my order? ]  [ ❓ What can you do? ]',
};

/** Splits "[ label ]" tap options out of a reply. */
function splitPills(text: string) {
  const pills: string[] = [];
  const body = text.replace(/\[\s*([^\]]+?)\s*\]/g, (_, label: string) => {
    pills.push(label);
    return '';
  });
  return { body: body.replace(/\n{3,}/g, '\n\n').trim(), pills };
}

/**
 * One-to-one chat with the AI shopping assistant, for anyone not in a group party
 * (inside a party, the assistant lives in the group chat instead).
 */
export function AssistantChatWidget() {
  const { user } = useAuth();
  const { activeSession } = useGroupShopping();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [giftState, setGiftState] = useState<unknown>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the conversation for this browser tab
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages) && parsed.messages.length) setMessages(parsed.messages);
        setGiftState(parsed.giftState ?? null);
      }
    } catch {
      /* storage unavailable — start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-40), giftState }));
    } catch {
      /* ignore */
    }
  }, [messages, giftState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending, isOpen]);

  // In a party the group chat has the assistant; vendors/admins aren't shopping
  if (activeSession || user?.role === 'VENDOR' || user?.role === 'ADMIN') return null;

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || isSending) return;
    const history = messages
      .filter((m) => m !== WELCOME && !m.error)
      .slice(-12)
      .map((m) => ({
        role: m.role,
        text: m.products?.length ? `${m.text}\n[showed: ${m.products.map((p) => p.title).join(', ')}]` : m.text,
      }));

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsSending(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, giftState }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Something went wrong.');
      setGiftState(json.data.giftState ?? null);
      setMessages((prev) => [...prev, { role: 'assistant', text: json.data.text, products: json.data.products }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err?.message || "Sorry, I couldn't answer that right now. Please try again.", error: true },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setGiftState(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-3 rounded-full shadow-2xl ring-4 ring-indigo-100 flex items-center gap-2 text-sm font-extrabold transition-all hover:scale-105"
        title={`Chat with ${ASSISTANT_NAME}, your shopping assistant`}
      >
        <span className="text-base">✨</span>
        Ask {ASSISTANT_NAME}
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-[380px] h-[min(600px,calc(100vh-1rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">✨</span>
          <div>
            <p className="text-sm font-extrabold leading-tight">{ASSISTANT_NAME}</p>
            <p className="text-[11px] text-indigo-100">Your shopping assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="p-2 rounded-full hover:bg-white/20" title="Start a new chat">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/20" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/60">
        {messages.map((m, i) => {
          if (m.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] bg-indigo-600 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm whitespace-pre-wrap break-words">
                  {m.text}
                </p>
              </div>
            );
          }
          const { body, pills } = splitPills(m.text);
          const isLatest = i === messages.length - 1;
          return (
            <div key={i} className="flex flex-col items-start gap-2">
              <div
                className={`max-w-[92%] text-xs px-3 py-2.5 rounded-2xl rounded-bl-sm border whitespace-pre-wrap break-words leading-relaxed ${
                  m.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {body}
              </div>

              {m.products && m.products.length > 0 && (
                <div className="w-full space-y-2">
                  {m.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="flex gap-3 items-center p-2.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.title} className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                        <p className="text-xs font-extrabold text-indigo-600 flex items-center gap-2">
                          {formatCurrency(p.price)}
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {p.rating.toFixed(1)}
                          </span>
                        </p>
                        {p.note && <p className="text-[10px] text-slate-500 truncate">{p.note}</p>}
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 shrink-0">View →</span>
                    </Link>
                  ))}
                </div>
              )}

              {pills.length > 0 && isLatest && !isSending && (
                <div className="flex flex-wrap gap-1.5">
                  {pills.map((label) => (
                    <button
                      key={label}
                      onClick={() => send(label)}
                      className="px-2.5 py-1.5 rounded-full bg-white border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            {ASSISTANT_NAME} is looking that up…
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${ASSISTANT_NAME} anything about shopping…`}
          maxLength={1000}
          className="flex-1 px-3.5 py-2.5 rounded-full bg-slate-100 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white border border-transparent focus:border-indigo-300"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {!user && (
        <p className="px-3 pb-2 -mt-1 text-[10px] text-slate-400 bg-white">Sign in so I can check your orders and wishlist.</p>
      )}
    </div>
  );
}
