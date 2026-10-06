'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, CheckCircle2, Clock, Crown, Users, Scale, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Flyout } from '@/components/common/Flyout';
import { CheckoutModal } from '@/components/CheckoutModal';
import { useAuth } from '@/context/AuthContext';
import { useGroupShopping, GroupMember } from '@/context/GroupShoppingContext';
import { calculateShares, payingMembers, CheckoutMode, SplitMethod } from '@/lib/groupSplit';
import { formatCurrency } from '@/lib/utils';

const memberName = (m?: GroupMember | null) => m?.user?.name || m?.guestName || 'Member';

const inputClass =
  'w-full bg-slate-50 text-sm text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors font-medium';

function modeLabel(mode: CheckoutMode, method?: SplitMethod | null) {
  if (mode === 'HOST_PAY') return 'Host pays for everything';
  return method === 'EQUAL' ? 'Split equally' : 'Everyone pays for what they added';
}

/**
 * Footer of the Group Cart tab: totals plus the whole group checkout flow —
 * host setup (who pays + delivery details), per-member "pay my share", payment
 * progress, and the final order confirmation.
 */
export function GroupCheckoutPanel({ subtotal, vendorCount }: { subtotal: number; vendorCount: number }) {
  const { user } = useAuth();
  const { activeSession, activeMember, isHost, startGroupCheckout, cancelGroupCheckout, payGroupShare } =
    useGroupShopping();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Host setup choices
  const [mode, setMode] = useState<CheckoutMode>(activeSession?.checkoutMode || 'HOST_PAY');
  const [method, setMethod] = useState<SplitMethod>('BY_ITEMS');
  const [shipping, setShipping] = useState({ name: '', email: '', phone: '', address: '' });

  const members = activeSession?.members || [];
  const items = activeSession?.items || [];

  const preview = useMemo(
    () => calculateShares(members as any, items as any, mode, method),
    [members, items, mode, method]
  );

  if (!activeSession) return null;

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 5000);
  };

  const openSetup = () => {
    const primary =
      user?.primaryAddressType === 'WORK'
        ? user?.workAddress || user?.homeAddress
        : user?.homeAddress || user?.workAddress;
    setShipping({
      name: user?.name || memberName(activeMember),
      email: user?.email || activeMember?.guestEmail || '',
      phone: user?.phone || '',
      address: primary || '',
    });
    setMode(activeSession.checkoutMode || 'HOST_PAY');
    setIsSetupOpen(true);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await startGroupCheckout({ checkoutMode: mode, splitMethod: method, shipping });
    setBusy(false);
    if (!res.success) {
      flash('error', res.error || 'Could not start checkout.');
      return;
    }
    setIsSetupOpen(false);
    if (mode === 'HOST_PAY') {
      setIsPayOpen(true); // host pays the whole cart right away
    } else {
      flash('success', 'Checkout started! Everyone can now pay their share from the Group Cart.');
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    const res = await cancelGroupCheckout();
    setBusy(false);
    flash(res.success ? 'success' : 'error', res.success ? 'Checkout cancelled — the cart is open again.' : res.error || 'Could not cancel checkout.');
  };

  const status = activeSession.status;
  const payers = members.filter((m) => (m.shareAmount || 0) > 0);
  const paidCount = payers.filter((m) => m.paidAt).length;
  const myShare = activeMember?.shareAmount || 0;
  const iHavePaid = !!activeMember?.paidAt;
  const host = members.find((m) => m.role === 'HOST');
  const info = activeSession.checkoutInfo && 'shipping' in activeSession.checkoutInfo ? activeSession.checkoutInfo : null;

  const noticeBox = notice && (
    <div
      className={`p-2.5 rounded-xl text-xs font-bold border ${
        notice.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-rose-50 border-rose-200 text-rose-700'
      }`}
    >
      {notice.text}
    </div>
  );

  return (
    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
      {noticeBox}

      {/* ---------- Cart open: totals + start checkout ---------- */}
      {status === 'ACTIVE' && (
        <>
          <div className="space-y-1.5 text-xs text-slate-500 font-medium">
            <div className="flex justify-between">
              <span>Group Cart Subtotal</span>
              <span className="text-slate-900 font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendor Sub-Orders Generated</span>
              <span className="text-purple-700 font-bold">{vendorCount} Packages</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-100 text-sm font-extrabold text-slate-900">
              <span>Total Amount</span>
              <span className="text-indigo-600">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {isHost ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={openSetup}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/25"
            >
              Proceed to Group Checkout
            </Button>
          ) : (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 font-medium flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Only the host ({memberName(host)}) can start checkout. Once they do, you&apos;ll be able to pay
                your share right here.
              </span>
            </div>
          )}
        </>
      )}

      {/* ---------- Waiting for payments ---------- */}
      {status === 'WAITING_FOR_PAYMENTS' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" /> Checkout in progress
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {modeLabel(activeSession.checkoutMode, activeSession.splitMethod)} · Total{' '}
                {formatCurrency(info?.total ?? subtotal)}
              </p>
            </div>
            <span className="text-xs font-extrabold text-purple-700">
              {paidCount} of {payers.length} paid
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${payers.length ? (paidCount / payers.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {payers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              >
                <span className="font-bold text-slate-800">
                  {memberName(m)}
                  {m.id === activeMember?.id && <span className="text-purple-600 font-semibold"> (You)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{formatCurrency(m.shareAmount || 0)}</span>
                  {m.paidAt ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-0.5">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {info?.shipping && (
            <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
              📦 Ships to <span className="font-bold text-slate-700">{info.shipping.name}</span>, {info.shipping.address}
            </p>
          )}

          {myShare > 0 && !iHavePaid ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setIsPayOpen(true)}
              rightIcon={<Lock className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/25"
            >
              {activeSession.checkoutMode === 'HOST_PAY'
                ? `Pay for the order (${formatCurrency(myShare)})`
                : `Pay my share (${formatCurrency(myShare)})`}
            </Button>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
              {iHavePaid
                ? `✅ You've paid your share. Waiting for ${payers.length - paidCount} more ${payers.length - paidCount === 1 ? 'person' : 'people'}…`
                : activeSession.checkoutMode === 'HOST_PAY'
                  ? `🎁 ${memberName(host)} is paying for this order — nothing for you to pay!`
                  : `🎉 You don't have anything to pay for this order.`}
            </div>
          )}

          {isHost && paidCount === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="w-full text-xs font-bold text-slate-500 hover:text-rose-600 underline"
            >
              Cancel checkout &amp; reopen the cart
            </button>
          )}
        </>
      )}

      {/* ---------- Order being placed (brief, the cart then empties) ---------- */}
      {status === 'CHECKED_OUT' && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center">
          🎉 Everyone has paid — placing your group order…
        </div>
      )}

      {/* ---------- Host checkout setup ---------- */}
      <Flyout
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        maxWidth="xl"
        title={
          <div>
            <span className="text-base font-extrabold text-slate-900 block leading-tight">Group Checkout</span>
            <span className="text-xs text-slate-500 font-medium">Choose who pays and where it ships</span>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Button type="button" variant="outline" size="md" onClick={() => setIsSetupOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="group-checkout-form"
              variant="primary"
              size="md"
              isLoading={busy}
              rightIcon={<Lock className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {mode === 'HOST_PAY' ? `Lock cart & pay ${formatCurrency(preview.total)}` : 'Lock cart & start split payment'}
            </Button>
          </div>
        }
      >
        <form id="group-checkout-form" onSubmit={handleStart} className="space-y-5">
          {noticeBox}

          {/* Who pays */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Who pays?</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'HOST_PAY' as const, icon: <Crown className="w-5 h-5" />, title: 'I pay for everything', desc: 'You pay the whole cart' },
                { id: 'SPLIT_PAY' as const, icon: <Users className="w-5 h-5" />, title: 'Split the bill', desc: 'Everyone pays a share' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setMode(o.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === o.id
                      ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20 text-purple-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {o.icon}
                  <p className="text-xs font-extrabold mt-1">{o.title}</p>
                  <p className="text-[11px] font-medium opacity-80">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* How to split */}
          {mode === 'SPLIT_PAY' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">How should we split it?</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'BY_ITEMS' as const, icon: <ShoppingBag className="w-5 h-5" />, title: 'Pay for what you added', desc: 'Each person pays for their own items' },
                  { id: 'EQUAL' as const, icon: <Scale className="w-5 h-5" />, title: 'Split equally', desc: `Total ÷ ${payingMembers(members).length} people` },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setMethod(o.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      method === o.id
                        ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20 text-purple-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {o.icon}
                    <p className="text-xs font-extrabold mt-1">{o.title}</p>
                    <p className="text-[11px] font-medium opacity-80">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live share preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <p className="font-extrabold text-slate-900">Who pays what</p>
            {preview.shares.map((s) => {
              const m = members.find((x) => x.id === s.memberId);
              return (
                <div key={s.memberId} className="flex justify-between text-slate-600 font-medium">
                  <span>
                    {memberName(m)}
                    {m?.id === activeMember?.id && <span className="text-purple-600"> (You)</span>}
                  </span>
                  <span className="text-slate-900 font-bold">{formatCurrency(s.amount)}</span>
                </div>
              );
            })}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
              <span>Total</span>
              <span className="text-indigo-600">{formatCurrency(preview.total)}</span>
            </div>
            {mode === 'SPLIT_PAY' && method === 'BY_ITEMS' && (
              <p className="text-[11px] text-slate-500">Members who didn&apos;t add anything don&apos;t pay.</p>
            )}
            {members.some((m) => m.status === 'INVITED') && mode === 'SPLIT_PAY' && method === 'EQUAL' && (
              <p className="text-[11px] text-slate-500">Invited people who haven&apos;t joined yet aren&apos;t included.</p>
            )}
            <p className="text-[11px] text-slate-500">
              The cart is locked while people pay. The order is placed automatically once everyone has paid.
            </p>
          </div>

          {/* Delivery details */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-700">Deliver the whole order to</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                placeholder="Full name"
                value={shipping.name}
                onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                className={inputClass}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={shipping.email}
                onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Phone (optional)"
                value={shipping.phone}
                onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                className={`${inputClass} sm:col-span-2`}
              />
              <textarea
                required
                rows={2}
                placeholder="Delivery address"
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                className={`${inputClass} sm:col-span-2`}
              />
            </div>
          </div>
        </form>
      </Flyout>

      {/* ---------- Pay my share (reuses the normal payment screen) ---------- */}
      <CheckoutModal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        items={items as any}
        onOrderSuccess={() => {}}
        paymentOnly={{
          amount: myShare,
          title: activeSession.checkoutMode === 'HOST_PAY' ? 'Pay for the group order' : 'Pay your share',
          subtitle: `${activeSession.title} • ${modeLabel(activeSession.checkoutMode, activeSession.splitMethod)}`,
          onPaid: async (payment) => {
            const res = await payGroupShare(payment);
            if (res.success) {
              setIsPayOpen(false);
              flash(
                'success',
                res.orderNumber
                  ? `🎉 Everyone has paid — order ${res.orderNumber} is placed!`
                  : '✅ Your share is paid! The order will be placed once everyone has paid.'
              );
            }
            return res;
          },
        }}
      />
    </div>
  );
}

/** Shown on the (now empty) Group Cart after an order was placed. */
export function GroupOrderPlacedBanner() {
  const { activeSession, isHost } = useGroupShopping();
  const info = activeSession?.checkoutInfo;
  if (!info || !('lastOrder' in info)) return null;
  const { lastOrder } = info;
  return (
    <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-center">
      <p className="text-sm font-extrabold text-emerald-800">🎉 Group order placed!</p>
      <p className="text-xs text-emerald-700 font-semibold">
        Order {lastOrder.orderNumber} · {formatCurrency(lastOrder.total)}
      </p>
      <p className="text-[11px] text-emerald-700">
        Shipping to {lastOrder.shipping.name}, {lastOrder.shipping.address}
      </p>
      {isHost && (
        <Link href={`/orders/${lastOrder.orderId}`} className="inline-block text-xs font-bold text-indigo-600 hover:underline">
          View order details →
        </Link>
      )}
    </div>
  );
}
