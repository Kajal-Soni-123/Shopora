'use client';

import React, { useState, useEffect } from 'react';
import { useGroupShopping } from '@/context/GroupShoppingContext';
import QRCode from 'qrcode';
import { ConfirmModal } from '@/components/common/ConfirmModal';

interface GroupShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupShoppingModal({ isOpen, onClose }: GroupShoppingModalProps) {
  const {
    activeSession,
    isHost,
    activeMember,
    createSession,
    joinSession,
    sendInviteEmails,
    removeMember,
    initiateGroupCheckout,
    leaveSession,
    fetchSuggestedUsers,
    setIsInviteDrawerOpen,
  } = useGroupShopping();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CREATE' | 'JOIN' | 'INVITE'>('ACTIVE');
  const [partyTitle, setPartyTitle] = useState("Alex's Shopping Party");
  const [checkoutMode, setCheckoutMode] = useState<'HOST_PAY' | 'SPLIT_PAY'>('HOST_PAY');
  const [guestHostName, setGuestHostName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [guestJoinName, setGuestJoinName] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [invitingEmails, setInvitingEmails] = useState<Record<string, boolean>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirmation Modal state for Leave Party and Remove Member
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const prevSessionIdRef = React.useRef<string | undefined>(undefined);

  const handleConfirmLeaveParty = async () => {
    setIsConfirmLoading(true);
    await leaveSession();
    setIsConfirmLoading(false);
    setIsLeaveConfirmOpen(false);
    onClose();
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsConfirmLoading(true);
    const res = await removeMember(memberToRemove.id);
    setIsConfirmLoading(false);
    if (res.success) {
      setToast({ type: 'success', message: `${memberToRemove.name} has been removed from the party.` });
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ type: 'error', message: res.error || 'Failed to remove member.' });
      setTimeout(() => setToast(null), 4000);
    }
    setMemberToRemove(null);
  };

  useEffect(() => {
    if (activeSession?.code) {
      const shareUrl = `${window.location.origin}?groupCode=${activeSession.code}`;
      QRCode.toDataURL(shareUrl, { width: 220, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code error:', err));
    }
  }, [activeSession?.code]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get('groupCode') || urlParams.get('joinCode') || urlParams.get('code');

    if (urlCode) {
      setJoinCodeInput(urlCode.toUpperCase());
    }

    const currentId = activeSession?.id;
    if (prevSessionIdRef.current !== currentId || urlCode) {
      if (urlCode && !activeMember) {
        setActiveTab('JOIN');
      } else if (activeSession && activeMember) {
        setActiveTab('ACTIVE');
      } else if (urlCode) {
        setActiveTab('JOIN');
      } else {
        setActiveTab('CREATE');
      }
      prevSessionIdRef.current = currentId;
    }
  }, [activeSession?.id, activeMember?.id]);

  useEffect(() => {
    if (activeTab === 'INVITE' && activeSession?.code) {
      setLoadingSuggestions(true);
      fetchSuggestedUsers(activeSession.code, inviteEmailInput)
        .then((res) => {
          if (res.success) {
            setSuggestedUsers(res.suggestions);
          }
        })
        .finally(() => setLoadingSuggestions(false));
    }
  }, [activeTab, activeSession?.code, inviteEmailInput]);

  const handleQuickInviteUser = async (email: string, name?: string) => {
    if (invitingEmails[email]) return;
    setInvitingEmails((prev) => ({ ...prev, [email]: true }));
    const result = await sendInviteEmails([email]);
    setInvitingEmails((prev) => ({ ...prev, [email]: false }));

    if (result.success) {
      setToast({ type: 'success', message: `Invitation sent to ${name || email}! 🎉` });
      setSuggestedUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to send invite.' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (!isOpen) return null;

  const joinLink = activeSession ? `${window.location.origin}?groupCode=${activeSession.code}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (activeSession) {
      navigator.clipboard.writeText(activeSession.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await createSession(partyTitle, checkoutMode, guestHostName);
    setIsSubmitting(false);
    if (result.success) {
      setActiveTab('INVITE');
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to create group shopping party.' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsSubmitting(true);
    const result = await joinSession(joinCodeInput.trim(), guestJoinName);
    setIsSubmitting(false);
    if (result.success) {
      setActiveTab('ACTIVE');
    } else if ((result as any).requiresLogin) {
      setToast({
        type: 'error',
        message: result.error || 'An account exists for this email. Please log in to join party.',
      });
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to join group session.' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setIsSubmitting(true);
    const res = await removeMember(memberId);
    setIsSubmitting(false);
    if (res.success) {
      setToast({ type: 'success', message: `${memberName} has been removed from the party.` });
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ type: 'error', message: res.error || 'Failed to remove member.' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleSendEmailInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmailInput.trim();
    if (!email) {
      setToast({ type: 'error', message: 'Please enter a recipient email address.' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setToast({ type: 'error', message: 'Please enter a valid email address (e.g. name@example.com).' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Check if email already belongs to an existing member/invitation in activeSession
    if (activeSession && Array.isArray(activeSession.members)) {
      const existingMember = activeSession.members.find(
        (m) =>
          (m.guestEmail && m.guestEmail.toLowerCase() === email.toLowerCase()) ||
          (m.user?.email && m.user.email.toLowerCase() === email.toLowerCase())
      );

      if (existingMember) {
        if (existingMember.status === 'JOINED') {
          setToast({ type: 'error', message: `${email} is already an active member of this group party.` });
          setTimeout(() => setToast(null), 4000);
          return;
        } else if (existingMember.status === 'INVITED') {
          setToast({ type: 'error', message: `An invitation has already been sent to ${email}.` });
          setTimeout(() => setToast(null), 4000);
          return;
        }
      }
    }

    setIsSubmitting(true);
    const result = await sendInviteEmails([email]);
    setIsSubmitting(false);

    if (result.success) {
      setInviteEmailInput('');
      setToast({ type: 'success', message: result.message || `Invitation email sent to ${email}!` });
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to send invitation email.' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out">
        {/* Header */}
        <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h2 className="text-xl font-bold">Group Shopping Party</h2>
              <p className="text-xs text-indigo-100">Shop together, share a cart & split payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {activeSession && (
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'ACTIVE'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🎉 Party Dashboard
            </button>
          )}
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'CREATE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ✨ Start New
          </button>
          <button
            onClick={() => setActiveTab('JOIN')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'JOIN'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            🔗 Join Party
          </button>
          {activeSession && (
            <button
              onClick={() => setActiveTab('INVITE')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'INVITE'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              ✉️ Invite Friends
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 transition-all duration-300 ease-in-out">
          {/* Toast Notification Banner */}
          {toast && (
            <div
              className={`p-3 text-xs font-semibold rounded-xl flex items-center justify-between transition-all shadow-2xs ${
                toast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs opacity-70 hover:opacity-100 ml-2"
              >
                ✕
              </button>
            </div>
          )}
          {/* TAB 1: ACTIVE SESSION */}
          {activeTab === 'ACTIVE' && activeSession && (
            <div key="active-tab" className="space-y-5 animate-tab-fade-in">
              <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{activeSession.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded">
                      Code: {activeSession.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-xs text-slate-500 hover:text-indigo-600 underline"
                    >
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                    {activeSession.checkoutMode === 'HOST_PAY' ? 'Host Single Pay' : 'Split Payment'}
                  </span>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Group Participants ({activeSession.members.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeSession.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow">
                          {member.guestName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {member.guestName}{' '}
                            {member.id === activeMember?.id && (
                              <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">(You)</span>
                            )}
                          </p>
                          {member.guestEmail && (
                            <p className="text-xs text-slate-400">{member.guestEmail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {member.role === 'HOST' ? (
                          <span className="text-[10px] uppercase font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            👑 Host
                          </span>
                        ) : member.status === 'INVITED' ? (
                          <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
                            <span>✉️</span>
                            <span>Invited</span>
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                            <span>✅</span>
                            <span>Joined</span>
                          </span>
                        )}

                        {/* Host Remove Member Action */}
                        {isHost && member.role !== 'HOST' && member.id !== activeMember?.id && (
                          <button
                            onClick={() => setMemberToRemove({ id: member.id, name: member.guestName })}
                            disabled={isSubmitting || isConfirmLoading}
                            className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center space-x-1 ml-1"
                            title={`Remove ${member.guestName} from party`}
                          >
                            <span>🗑️</span>
                            <span className="text-[10px] font-bold">Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  onClick={() => setActiveTab('INVITE')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors text-sm flex items-center justify-center space-x-2"
                >
                  <span>✉️</span>
                  <span>Invite More Friends</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsLeaveConfirmOpen(true)}
                    className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-slate-200 dark:border-slate-800"
                  >
                    Leave Party
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE SESSION */}
          {activeTab === 'CREATE' && (
            <form key="create-tab" onSubmit={handleCreateSubmit} className="space-y-4 animate-tab-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Party Name
                </label>
                <input
                  type="text"
                  required
                  value={partyTitle}
                  onChange={(e) => setPartyTitle(e.target.value)}
                  placeholder="e.g. Birthday Shopping Spree"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Host Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={guestHostName}
                  onChange={(e) => setGuestHostName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Checkout & Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label
                    onClick={() => setCheckoutMode('HOST_PAY')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      checkoutMode === 'HOST_PAY'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">👑 Host Single Pay</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Host pays total bill & receives items at Host address.
                    </div>
                  </label>

                  <label
                    onClick={() => setCheckoutMode('SPLIT_PAY')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      checkoutMode === 'SPLIT_PAY'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">💳 Split Payment</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Each member pays for their items & delivers to personal address.
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors text-sm mt-4"
              >
                {isSubmitting ? 'Creating Party...' : '✨ Start Group Shopping Party'}
              </button>
            </form>
          )}

          {/* TAB 3: JOIN SESSION */}
          {activeTab === 'JOIN' && (
            <form key="join-tab" onSubmit={handleJoinSubmit} className="space-y-4 animate-tab-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Enter Group Join Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. GRP-849201"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono tracking-wider focus:ring-2 focus:ring-indigo-600 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Your Display Name (If guest)
                </label>
                <input
                  type="text"
                  value={guestJoinName}
                  onChange={(e) => setGuestJoinName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors text-sm mt-4"
              >
                {isSubmitting ? 'Joining...' : '🚀 Join Group Session'}
              </button>
            </form>
          )}

          {/* TAB 4: INVITE FRIENDS */}
          {activeTab === 'INVITE' && activeSession && (
            <div key="invite-tab" className="space-y-5 animate-tab-fade-in">
              {/* Join Link & QR */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Group Shopping QR Code"
                    className="w-36 h-36 rounded-lg shadow-xs border bg-white p-1 mb-2"
                  />
                )}
                <p className="text-xs text-slate-500 font-semibold mb-2">Scan QR code or copy invite link</p>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  {copiedLink ? 'Copied Link!' : '📋 Copy Invitation Link'}
                </button>
              </div>

              {/* Single Email Input Invite Form with Live Auto-Suggest */}
              <form onSubmit={handleSendEmailInvites} className="space-y-3 relative">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Send Instant Email Invitation
                </label>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      required
                      value={inviteEmailInput}
                      onChange={(e) => setInviteEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendEmailInvites(e);
                        }
                      }}
                      placeholder="Enter name or email address (e.g. alex@example.com)"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <span>✉️</span>
                      <span>{isSubmitting ? 'Sending...' : 'Send Invite'}</span>
                    </button>
                  </div>

                  {/* Auto-suggest dropdown menu when typing matching query */}
                  {inviteEmailInput.trim().length > 0 && suggestedUsers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                        Matching Registered Users
                      </div>
                      {suggestedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between cursor-pointer transition-colors"
                          onClick={() => {
                            setInviteEmailInput(user.email);
                          }}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickInviteUser(user.email, user.name);
                            }}
                            disabled={invitingEmails[user.email]}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors flex-shrink-0"
                          >
                            {invitingEmails[user.email] ? 'Sending...' : 'Invite ✨'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>

              {/* Suggested Registered Users Grid / Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-tab-fade-in transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Suggested Friends to Invite</span>
                  </h4>
                  {loadingSuggestions && (
                    <span className="text-[10px] text-indigo-500 animate-pulse">Searching...</span>
                  )}
                </div>

                {suggestedUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">
                    {loadingSuggestions ? 'Loading user suggestions...' : 'All registered shoppers are already in party or invited!'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {suggestedUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          user.isNearby
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-xs flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                              {user.isNearby && (
                                <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-extrabold rounded-full tracking-wide">
                                  NEARBY
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span>{user.email}</span>
                              {user.locationLabel && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{user.locationLabel}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickInviteUser(user.email, user.name)}
                          disabled={invitingEmails[user.email]}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1 whitespace-nowrap"
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
      </div>

      {/* Confirmation Modal for Leave Party */}
      <ConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleConfirmLeaveParty}
        title="Leave Group Shopping Party"
        itemName={activeSession ? `Party: "${activeSession.title}"` : undefined}
        description="Are you sure you want to leave this party? You will be removed from the party participants list and lose access to the shared cart and group chat."
        confirmText="Leave Party"
        cancelText="Cancel"
        variant="danger"
        isLoading={isConfirmLoading}
      />

      {/* Confirmation Modal for Host Remove Member */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Party Participant"
        itemName={memberToRemove ? `Member: "${memberToRemove.name}"` : undefined}
        description="Are you sure you want to remove this participant from the group shopping party? They will no longer have access to the party or group cart."
        confirmText="Remove Member"
        cancelText="Cancel"
        variant="danger"
        isLoading={isConfirmLoading}
      />
    </div>
  );
}
