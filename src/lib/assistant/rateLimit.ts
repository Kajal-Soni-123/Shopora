/**
 * Small in-memory rate limit for assistant messages, so one person can't use up the shared
 * (free-tier) Gemini quota. Per server process — good enough for a single Next.js server.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

export const ASSISTANT_RATE_LIMIT_MESSAGE = "You're sending messages a little fast — please wait a few seconds 🙏";

export function isAssistantRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}
