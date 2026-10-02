import { VirtualTryOnProvider, VirtualTryOnInput, VirtualTryOnProviderResult } from './types';
import { MockTryOnProvider } from './providers/MockTryOnProvider';
import { HttpAIProvider } from './providers/HttpAIProvider';
import { GeminiVisionTryOnProvider } from './providers/GeminiVisionTryOnProvider';
import { HuggingFaceTryOnProvider } from './providers/HuggingFaceTryOnProvider';
import { FluxKontextProvider } from './providers/FluxKontextProvider';
import { PerfectCorpWatchProvider } from './providers/PerfectCorpWatchProvider';

export class VirtualTryOnService {
  private static instance: VirtualTryOnService;
  private defaultProvider: VirtualTryOnProvider;
  private watchProvider: PerfectCorpWatchProvider;

  private constructor() {
    this.watchProvider = new PerfectCorpWatchProvider();

    const providerName = (process.env.VIRTUAL_TRY_ON_PROVIDER || '').toLowerCase().trim();

    if (providerName === 'http' || providerName === 'external' || providerName === 'api') {
      this.defaultProvider = new HttpAIProvider();
    } else if (providerName === 'mock') {
      this.defaultProvider = new MockTryOnProvider();
    } else if (providerName === 'huggingface' || providerName === 'hf') {
      this.defaultProvider = new HuggingFaceTryOnProvider();
    } else if (providerName === 'kontext' || providerName === 'flux') {
      this.defaultProvider = new FluxKontextProvider();
    } else {
      // Default: Google Gemini Vision Step 1 + FLUX.1 Kontext Step 2
      this.defaultProvider = new GeminiVisionTryOnProvider();
    }
  }

  public static getInstance(): VirtualTryOnService {
    if (!VirtualTryOnService.instance) {
      VirtualTryOnService.instance = new VirtualTryOnService();
    }
    return VirtualTryOnService.instance;
  }

  public getProviderName(category?: string): string {
    if ((category || '').toUpperCase() === 'WATCH') {
      return this.watchProvider.name;
    }
    return this.defaultProvider.name;
  }

  public async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    if (!input.userImage) {
      throw new Error('User image is required for virtual try-on processing.');
    }
    if (!input.productImage) {
      throw new Error('Product try-on image is required.');
    }
    if (!input.jewelleryType) {
      throw new Error('Jewellery type must be specified.');
    }

    const providerNameEnv = (process.env.VIRTUAL_TRY_ON_PROVIDER || '').toLowerCase().trim();
    const apiKeyEnv = (process.env.PERFECT_CORP_API_KEY || '').toLowerCase().trim();

    // Direct Perfect Corp Watch VTO execution for WATCH category (unless mock mode is explicitly configured in .env)
    if (input.jewelleryType === 'WATCH' && providerNameEnv !== 'mock' && apiKeyEnv !== 'mock') {
      console.log('[VirtualTryOnService] Routing WATCH try-on to PerfectCorpWatchProvider');
      return await this.watchProvider.generateTryOn(input);
    }

    const selectedProvider = (providerNameEnv === 'mock' || apiKeyEnv === 'mock') ? new MockTryOnProvider() : this.defaultProvider;
    return await selectedProvider.generateTryOn(input);
  }
}
