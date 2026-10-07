/**
 * Minimal Gemini (Google AI Studio) client with function calling.
 * Server-only: the API key never reaches the browser.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * "-latest" aliases always point at Google's current models (pinned names like gemini-1.5-flash
 * get retired). Flash-Lite answers tool calls in ~1–2s on the free tier; full Flash is the
 * backup when Lite is busy or rate-limited (with "thinking" off so it stays fast).
 */
const MODELS = [
  { name: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', generation: {} },
  { name: process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-latest', generation: { thinkingConfig: { thinkingBudget: 0 } } },
];
const PER_MODEL_TIMEOUT_MS = 12000;

export const isAssistantAIConfigured = () => !!process.env.GEMINI_API_KEY;

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  thoughtSignature?: string; // must be sent back unchanged in later turns
  [key: string]: unknown;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

export async function generateContent(opts: {
  systemInstruction: string;
  contents: GeminiContent[];
  tools: FunctionDeclaration[];
}): Promise<GeminiContent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('GEMINI_API_KEY is not configured');

  let lastError: unknown;
  for (const model of MODELS) {
    try {
      const res = await fetch(`${API_BASE}/${model.name}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.systemInstruction }] },
          contents: opts.contents,
          tools: [{ functionDeclarations: opts.tools }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1024, ...model.generation },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const err = new GeminiError(`${model.name}: ${data.error?.message || `request failed (${res.status})`}`, res.status);
        // Busy / rate-limited / server error → try the next model; anything else is a real error
        if (res.status === 429 || res.status >= 500) {
          lastError = err;
          continue;
        }
        throw err;
      }
      const content = data.candidates?.[0]?.content as GeminiContent | undefined;
      if (!content?.parts?.length) {
        lastError = new GeminiError(`${model.name}: no content (${data.candidates?.[0]?.finishReason || 'unknown'})`);
        continue;
      }
      return { role: 'model', parts: content.parts };
    } catch (err: any) {
      if (err instanceof GeminiError && err.status && err.status !== 429 && err.status < 500) throw err;
      lastError = err?.name === 'TimeoutError' ? new GeminiError(`${model.name}: timed out`) : err;
    }
  }
  throw lastError instanceof Error ? lastError : new GeminiError('All Gemini models failed');
}
