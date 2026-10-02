import { VirtualTryOnProvider, VirtualTryOnInput, VirtualTryOnProviderResult } from '../types';

export class HttpAIProvider implements VirtualTryOnProvider {
  name = 'External Open-Source AI Service';

  private serviceUrl: string;
  private apiKey?: string;

  constructor() {
    this.serviceUrl = process.env.VIRTUAL_TRY_ON_SERVICE_URL || '';
    this.apiKey = process.env.VIRTUAL_TRY_ON_API_KEY;
  }

  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    if (!this.serviceUrl) {
      throw new Error(
        'VIRTUAL_TRY_ON_SERVICE_URL is not configured. Please configure an external AI service endpoint in your environment variables.'
      );
    }

    const startTime = Date.now();
    console.log(`[HttpAIProvider] Dispatching request to AI endpoint: ${this.serviceUrl}`);

    const payload = {
      userImage: typeof input.userImage === 'string' ? input.userImage : input.userImage.toString('base64'),
      productImage: typeof input.productImage === 'string' ? input.productImage : input.productImage.toString('base64'),
      jewelleryType: input.jewelleryType,
      productId: input.productId,
      productTitle: input.productTitle
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for AI model

    try {
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Service failed with status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const resultUrl = data.resultImageUrl || data.imageUrl || data.image;

      if (!resultUrl) {
        throw new Error('AI Service response did not return a valid result image URL');
      }

      return {
        imageUrl: resultUrl,
        processingTimeMs: Date.now() - startTime,
        providerName: this.name
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('The try-on is taking longer than expected. Please try again.');
      }
      throw err;
    }
  }
}
