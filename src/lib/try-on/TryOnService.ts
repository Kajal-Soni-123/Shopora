import { ITryOnProvider, TryOnInput, TryOnProviderResult } from './types';
import { FashnTryOnProvider } from './providers/FashnTryOnProvider';
import { GeminiImageTryOnProvider } from './providers/GeminiImageTryOnProvider';
import { MockTryOnProvider } from './providers/MockTryOnProvider';
import { WearableItemType, isGarment } from './wearableItems';
import crypto from 'crypto';

/**
 * Routes each try-on to a provider based on the item type.
 *
 * TRYON_PROVIDER:
 *   - "gemini" (default): Gemini image editing for everything; garments use FASHN
 *     instead when FASHN_API_KEY is set (dedicated garment model, better draping).
 *   - "fashn": FASHN for everything.
 *   - "mock": returns the user photo unchanged (UI development only).
 */
export class TryOnService {
  private static instance: TryOnService;
  private mode: string;
  private providers: { gemini: ITryOnProvider; fashn: ITryOnProvider; mock: ITryOnProvider };

  private constructor() {
    this.mode = (process.env.TRYON_PROVIDER || 'gemini').toLowerCase().trim();
    this.providers = {
      gemini: new GeminiImageTryOnProvider(),
      fashn: new FashnTryOnProvider(),
      mock: new MockTryOnProvider(),
    };
  }

  public static getInstance(): TryOnService {
    if (!TryOnService.instance) {
      TryOnService.instance = new TryOnService();
    }
    return TryOnService.instance;
  }

  private getProvider(itemType?: WearableItemType): ITryOnProvider {
    if (this.mode === 'mock') return this.providers.mock;
    if (this.mode === 'fashn') return this.providers.fashn;
    if (itemType && isGarment(itemType) && process.env.FASHN_API_KEY) return this.providers.fashn;
    return this.providers.gemini;
  }

  public getProviderName(itemType?: WearableItemType): string {
    return this.getProvider(itemType).name;
  }

  public generateInputHash(userImageUrl: string, productId: string, category: string): string {
    const data = `${userImageUrl}_${productId}_${category}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async createTryOnJob(input: TryOnInput): Promise<TryOnProviderResult> {
    if (!input.userImageUrl) {
      throw new Error('User photograph is required to perform Virtual Try-On.');
    }
    if (!input.productImageUrl) {
      throw new Error('Product try-on image is required.');
    }

    return await this.getProvider(input.itemType).createJob(input);
  }

  /** Polls the provider that created the job (identified by the provider name stored on TryOnJob). */
  public async getTryOnStatus(providerJobId: string, providerName?: string): Promise<TryOnProviderResult> {
    if (!providerJobId) {
      throw new Error('Provider job ID is required to fetch status.');
    }

    const provider =
      Object.values(this.providers).find((p) => p.name === providerName) || this.getProvider();
    return await provider.getJobStatus(providerJobId);
  }
}
