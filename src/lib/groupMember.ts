import type { UserPayload } from '@/lib/auth';

type MemberLike = {
  id: string;
  userId: string | null;
  guestEmail: string | null;
};

/**
 * Resolve which group member a request is acting as.
 * - Logged-in users always act as their own member record (by account, or an
 *   unclaimed invite for their email) — a client-supplied id can't override this.
 * - Guests may only act as a guest member (one not linked to an account).
 * Never falls back to another member (e.g. the host).
 */
export function resolveActingMember<T extends MemberLike>(
  members: T[],
  user: UserPayload | null,
  requestedMemberId?: string | null
): T | null {
  if (user?.userId) {
    const email = user.email?.toLowerCase();
    return (
      members.find((m) => m.userId === user.userId) ||
      (email
        ? members.find((m) => !m.userId && m.guestEmail?.trim().toLowerCase() === email)
        : undefined) ||
      null
    );
  }

  if (!requestedMemberId) return null;
  return members.find((m) => m.id === requestedMemberId && !m.userId) || null;
}

/**
 * True when the page asked to act as one member but the auth cookie belongs to a
 * different one — e.g. another account logged in from a different tab, which
 * replaces the shared cookie. Acting anyway would vote/post as the wrong person.
 */
export function isStaleIdentity(
  resolved: { id: string } | null,
  user: UserPayload | null,
  requestedMemberId?: string | null
): boolean {
  return !!user?.userId && !!requestedMemberId && resolved?.id !== requestedMemberId;
}

export const STALE_IDENTITY_ERROR =
  'You are now signed in as a different account (possibly in another tab). Please refresh the page.';
