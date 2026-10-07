'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGroupShopping } from '@/context/GroupShoppingContext';

/**
 * Asks a logged-in user to accept or decline a pending group shopping invitation.
 * Invited users are no longer added to a party automatically on login.
 */
export function GroupInvitePrompt() {
  const { pendingInvites, acceptInvite, declineInvite, isGroupModalOpen } = useGroupShopping();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Maybe later" hides an invitation until the next page load
  const [snoozed, setSnoozed] = useState<string[]>([]);

  const visible = pendingInvites.filter((i) => !snoozed.includes(i.code));
  const invite = visible[0];
  // Don't stack on top of the party modal (e.g. when they opened an invite link)
  if (!invite || isGroupModalOpen) return null;

  const respond = async (action: 'accept' | 'decline') => {
    setBusy(action);
    setError(null);
    const res = action === 'accept' ? await acceptInvite(invite.code) : await declineInvite(invite.code);
    setBusy(null);
    if (!res.success) setError(res.error || 'Something went wrong. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 px-5 py-4 text-white flex items-center gap-3">
          <span className="text-3xl">🛍️</span>
          <div>
            <p className="text-xs font-semibold text-indigo-100">You&apos;re invited!</p>
            <h2 className="text-base font-extrabold leading-tight">Group Shopping Party</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            <strong className="text-slate-900">{invite.hostName}</strong> invited you to shop together in{' '}
            <strong className="text-slate-900">&ldquo;{invite.title}&rdquo;</strong>. Join to share a cart, chat and split
            the bill.
          </p>
          <p className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 inline-block">
            Code: {invite.code}
          </p>

          {error && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => respond('decline')}
              className="py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {busy === 'decline' && <Loader2 className="w-4 h-4 animate-spin" />}
              Decline
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => respond('accept')}
              className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-extrabold text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {busy === 'accept' && <Loader2 className="w-4 h-4 animate-spin" />}
              Accept &amp; Join
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setSnoozed((s) => [...s, invite.code])}
              className="font-semibold hover:text-slate-600 underline"
            >
              Maybe later
            </button>
            {visible.length > 1 && <span>+{visible.length - 1} more invitation{visible.length > 2 ? 's' : ''}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown once to members when the host ends the party they were in. */
export function GroupPartyEndedNotice() {
  const { partyEndedNotice, dismissPartyEndedNotice } = useGroupShopping();
  if (!partyEndedNotice) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-3">
        <span className="text-4xl">👋</span>
        <h2 className="text-base font-extrabold text-slate-900">This party has ended</h2>
        <p className="text-sm text-slate-600">
          The host ended <strong className="text-slate-900">&ldquo;{partyEndedNotice}&rdquo;</strong>, so you&apos;ve been
          removed from it. The shared cart and group chat are no longer available.
        </p>
        <button
          type="button"
          onClick={dismissPartyEndedNotice}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-extrabold text-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
