import { ITryOnProvider, TryOnInput, TryOnProviderResult, TryOnJobStatus } from '../types';
import { MockTryOnProvider } from './MockTryOnProvider';

export class FashnTryOnProvider implements ITryOnProvider {
  public name = 'FASHN-TryOn-Max';
  private apiKey: string;
  private mockFallback: MockTryOnProvider;

  constructor() {
    this.apiKey = process.env.FASHN_API_KEY || '';
    this.mockFallback = new MockTryOnProvider();
  }

  /**
   * Maps internal TryOnCategory to FASHN API category format
   */
  private mapFashnCategory(category: string): 'top' | 'bottom' | 'one-piece' | 'coverall' {
    const cat = (category || '').toUpperCase();
    if (cat === 'BOTTOM' || cat === 'JEANS' || cat === 'PANTS' || cat === 'SKIRT') {
      return 'bottom';
    }
    if (cat === 'DRESS' || cat === 'ONE_PIECE' || cat === 'SAREE' || cat === 'KURTI') {
      return 'one-piece';
    }
    if (cat === 'FULL_OUTFIT' || cat === 'OUTERWEAR' || cat === 'JACKET') {
      return 'coverall';
    }
    return 'top';
  }

  public async createJob(input: TryOnInput): Promise<TryOnProviderResult> {
    if (!this.apiKey) {
      return {
        status: 'FAILED',
        errorMessage: 'FASHN_API_KEY is not set. Set it, or use TRYON_PROVIDER=gemini.',
      };
    }

    try {
      const fashnCategory = this.mapFashnCategory(input.category);

      const response = await fetch('https://api.fashn.ai/v1/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_image: input.userImageUrl,
          garment_image: input.productImageUrl,
          category: fashnCategory,
          mode: 'quality',
          nsfw_filter: true,
          cover_feet: false,
          adjust_hands: true,
          restore_background: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || data.message || `FASHN API error (${response.status})`;
        console.error('[FashnTryOnProvider] Error initiating job:', errorMsg);
        return {
          status: 'FAILED',
          errorMessage: errorMsg,
        };
      }

      const providerJobId = data.id;
      const initialStatus = this.mapFashnStatus(data.status);

      return {
        providerJobId,
        status: initialStatus,
        resultImageUrl: Array.isArray(data.output) ? data.output[0] : undefined,
      };
    } catch (err: any) {
      console.error('[FashnTryOnProvider] Exception creating try-on job:', err);
      return {
        status: 'FAILED',
        errorMessage: err.message || 'Network failure communicating with FASHN VTON service.',
      };
    }
  }

  public async getJobStatus(providerJobId: string): Promise<TryOnProviderResult> {
    if (!this.apiKey || providerJobId.startsWith('fashn_job_')) {
      return this.mockFallback.getJobStatus(providerJobId);
    }

    try {
      const response = await fetch(`https://api.fashn.ai/v1/status/${providerJobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          providerJobId,
          status: 'FAILED',
          errorMessage: data.error?.message || 'Failed to fetch job status from FASHN provider.',
        };
      }

      const status = this.mapFashnStatus(data.status);
      const resultImageUrl = Array.isArray(data.output) && data.output.length > 0 ? data.output[0] : undefined;

      return {
        providerJobId,
        status,
        resultImageUrl,
        errorMessage: data.error ? String(data.error) : undefined,
      };
    } catch (err: any) {
      console.error('[FashnTryOnProvider] Exception polling job status:', err);
      return {
        providerJobId,
        status: 'FAILED',
        errorMessage: err.message || 'Error checking FASHN try-on job status.',
      };
    }
  }

  private mapFashnStatus(fashnStatus: string): TryOnJobStatus {
    const s = (fashnStatus || '').toLowerCase();
    if (s === 'completed') return 'COMPLETED';
    if (s === 'failed' || s === 'cancelled') return 'FAILED';
    if (s === 'in_progress' || s === 'starting') return 'PROCESSING';
    return 'PENDING';
  }
}
