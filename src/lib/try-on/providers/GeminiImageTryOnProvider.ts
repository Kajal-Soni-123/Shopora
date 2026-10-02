import { ITryOnProvider, TryOnInput, TryOnProviderResult } from '../types';
import { loadInlineImage } from '../imageSource';
import { buildTryOnPrompt, detectWearableItem } from '../wearableItems';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const REQUEST_TIMEOUT_MS = 90000;
const MAX_ATTEMPTS = 2;

class GeminiRequestError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message);
  }
}

/**
 * Virtual try-on via Gemini's native image editing model.
 * Sends BOTH the person photo and the product photo in one request, so the model
 * copies the real product instead of inventing one from a text description.
 * Generation is synchronous: createJob returns COMPLETED or FAILED.
 */
export class GeminiImageTryOnProvider implements ITryOnProvider {
  public name = 'Gemini-Image-TryOn';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = (process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL).trim();
  }

  public async createJob(input: TryOnInput): Promise<TryOnProviderResult> {
    if (!this.apiKey) {
      return { status: 'FAILED', errorMessage: 'Virtual Try-On is not configured: GEMINI_API_KEY is missing on the server.' };
    }

    const startedAt = Date.now();
    const item = input.itemType || detectWearableItem(input.category, input.productTitle);

    let userImage, productImage;
    try {
      [userImage, productImage] = await Promise.all([
        loadInlineImage(input.userImageUrl),
        loadInlineImage(input.productImageUrl),
      ]);
    } catch (err: any) {
      return { status: 'FAILED', errorMessage: `Could not read the images for try-on: ${err?.message || err}` };
    }

    const prompt = buildTryOnPrompt(item, input.productTitle);
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Image 1 (the person):' },
            { inlineData: userImage },
            { text: 'Image 2 (the product):' },
            { inlineData: productImage },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    };

    let lastError = 'Unknown error';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const resultImageUrl = await this.generate(body);
        console.log(`[GeminiImageTryOnProvider] ${item} try-on done in ${Date.now() - startedAt}ms (model ${this.model}, attempt ${attempt})`);
        return { providerJobId: `gemini_${Date.now()}`, status: 'COMPLETED', resultImageUrl };
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[GeminiImageTryOnProvider] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
        if (err?.retryable !== true) break;
      }
    }

    return { status: 'FAILED', errorMessage: lastError };
  }

  public async getJobStatus(providerJobId: string): Promise<TryOnProviderResult> {
    // Jobs complete synchronously in createJob, so there is never anything to poll.
    return { providerJobId, status: 'FAILED', errorMessage: 'Gemini try-on jobs are not pollable.' };
  }

  private async generate(body: unknown): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_API_BASE}/${this.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: any) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw new GeminiRequestError(
        timedOut ? 'The try-on is taking longer than expected. Please try again.' : `Network error contacting Gemini: ${err?.message || err}`,
        !timedOut
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[GeminiImageTryOnProvider] HTTP ${response.status}: ${errText.slice(0, 500)}`);
      if (response.status === 429) {
        throw new GeminiRequestError('Try-on quota reached for the AI model. Please try again in a minute.', false);
      }
      if (response.status === 400 && /api key/i.test(errText)) {
        throw new GeminiRequestError('GEMINI_API_KEY is invalid.', false);
      }
      if (response.status === 403) {
        throw new GeminiRequestError('The Gemini API key does not have access to the image model (billing may need to be enabled).', false);
      }
      if (response.status === 404) {
        throw new GeminiRequestError(`Gemini model "${this.model}" was not found. Set GEMINI_IMAGE_MODEL to an available image model.`, false);
      }
      throw new GeminiRequestError(`Gemini request failed (HTTP ${response.status}).`, response.status >= 500);
    }

    const data: any = await response.json();

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new GeminiRequestError(`The photo was rejected by the AI safety filter (${blockReason}). Please use a different photo.`, false);
    }

    const candidate = data?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];
    const imagePart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);

    if (!imagePart) {
      const finishReason = candidate?.finishReason || 'NO_IMAGE';
      const text = parts.map((p) => p?.text).filter(Boolean).join(' ').slice(0, 300);
      console.warn(`[GeminiImageTryOnProvider] No image returned. finishReason=${finishReason} text="${text}"`);
      if (/SAFETY|PROHIBITED|BLOCKLIST/i.test(finishReason)) {
        throw new GeminiRequestError('The AI safety filter blocked this try-on. Please use a different photo.', false);
      }
      // The model occasionally answers with text only; one retry usually fixes it.
      throw new GeminiRequestError('The AI model did not return an image. Please try again with a clearer photo.', true);
    }

    const inline = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inline.mimeType || inline.mime_type || 'image/png';
    return `data:${mimeType};base64,${inline.data}`;
  }
}
