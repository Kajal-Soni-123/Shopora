/**
 * Group checkout share calculation — shared by the server (authoritative, DB prices)
 * and the host's checkout preview.
 *
 *  HOST_PAY            → the host pays the whole cart
 *  SPLIT_PAY + BY_ITEMS → each member pays for the items they added
 *  SPLIT_PAY + EQUAL    → the total is divided equally between joined members
 *
 * Amounts are in cents internally so shares always add up exactly to the total;
 * any leftover cent from an equal split goes to the host.
 */

export type CheckoutMode = 'HOST_PAY' | 'SPLIT_PAY';
export type SplitMethod = 'BY_ITEMS' | 'EQUAL';

export const GENIE_EMAIL = 'genie@shopora.ai';

interface SplitMember {
  id: string;
  role: string;
  status: string;
  guestEmail?: string | null;
}

interface SplitItem {
  quantity: number;
  addedById: string;
  product: { price: number };
}

export interface MemberShare {
  memberId: string;
  amount: number;
}

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

/** Members who take part in paying: joined humans (not the Genie bot, not pending invites). */
export function payingMembers<M extends SplitMember>(members: M[]): M[] {
  return members.filter((m) => m.guestEmail !== GENIE_EMAIL && m.status !== 'INVITED');
}

export function calculateShares(
  members: SplitMember[],
  items: SplitItem[],
  mode: CheckoutMode,
  method: SplitMethod
): { total: number; shares: MemberShare[] } {
  const totalCents = items.reduce((sum, i) => sum + toCents(i.product.price) * i.quantity, 0);
  const people = payingMembers(members);
  const host = people.find((m) => m.role === 'HOST') || people[0];
  if (!host || totalCents === 0) return { total: fromCents(totalCents), shares: [] };

  const cents = new Map<string, number>();

  if (mode === 'HOST_PAY') {
    cents.set(host.id, totalCents);
  } else if (method === 'BY_ITEMS') {
    for (const item of items) {
      // Items from someone no longer paying (e.g. left the party) fall to the host
      const payer = people.some((m) => m.id === item.addedById) ? item.addedById : host.id;
      cents.set(payer, (cents.get(payer) || 0) + toCents(item.product.price) * item.quantity);
    }
  } else {
    const each = Math.floor(totalCents / people.length);
    for (const m of people) cents.set(m.id, each);
    cents.set(host.id, (cents.get(host.id) || 0) + (totalCents - each * people.length));
  }

  return {
    total: fromCents(totalCents),
    shares: Array.from(cents.entries())
      .filter(([, c]) => c > 0)
      .map(([memberId, c]) => ({ memberId, amount: fromCents(c) })),
  };
}
