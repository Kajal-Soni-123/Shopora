/**
 * The group-chat shopping assistant's identity. Change the name here to rename it everywhere
 * users can see it. (Code and API paths still say "genie" internally.)
 */
export const ASSISTANT_NAME = 'Aria';
export const ASSISTANT_DISPLAY_NAME = 'Aria ✨';

/** Stable identifier of the assistant's member record in each party — not shown to users. */
export const ASSISTANT_EMAIL = 'genie@shopora.ai';

/** Messages may address the assistant directly, e.g. "@aria red shirts" (old "@genie" still works). */
export const ASSISTANT_MENTION = /@(aria|genie)\b/gi;

export function isAssistantSender(sender?: { guestEmail?: string | null } | null): boolean {
  return sender?.guestEmail === ASSISTANT_EMAIL;
}
