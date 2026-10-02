import { ITryOnProvider, TryOnInput, TryOnProviderResult } from '../types';

export class MockTryOnProvider implements ITryOnProvider {
  public name = 'FASHN-Mock-Provider';

  private jobs = new Map<string, { status: 'PROCESSING' | 'COMPLETED' | 'FAILED'; resultUrl?: string; createdAt: number }>();

  public async createJob(input: TryOnInput): Promise<TryOnProviderResult> {
    const providerJobId = `fashn_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // In mock / fallback mode, use the user's uploaded photo as the baseline result image
    const chosenResult = input.userImageUrl || input.productImageUrl;

    this.jobs.set(providerJobId, {
      status: 'COMPLETED',
      resultUrl: chosenResult,
      createdAt: Date.now(),
    });

    return {
      providerJobId,
      status: 'COMPLETED',
      resultImageUrl: chosenResult,
    };
  }

  public async getJobStatus(providerJobId: string): Promise<TryOnProviderResult> {
    const job = this.jobs.get(providerJobId);

    if (!job) {
      return {
        providerJobId,
        status: 'COMPLETED',
      };
    }

    return {
      providerJobId,
      status: 'COMPLETED',
      resultImageUrl: job.resultUrl,
    };
  }
}
