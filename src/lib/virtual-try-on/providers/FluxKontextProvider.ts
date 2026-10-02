import { fal } from '@fal-ai/client';
import {
  VirtualTryOnProvider,
  VirtualTryOnInput,
  VirtualTryOnProviderResult,
  LLMVisionAnalysis
} from '../types';
import { buildKontextPrompt } from '../kontextPromptBuilder';

export interface FluxKontextInput {
  userImage: string | Buffer;
  productImage?: string | Buffer;
  analysis?: LLMVisionAnalysis | null;
  prompt?: string;
  jewelleryType?: string;
  productTitle?: string;
}

export class FluxKontextProvider implements VirtualTryOnProvider {
  name = 'FLUX.1 Kontext AI Image Editing Engine (fal.ai)';
  private defaultModel = 'fal-ai/flux-kontext/dev';

  /**
   * Main entry point implementing VirtualTryOnProvider interface
   */
  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    return this.executeTryOnEdit({
      userImage: input.userImage,
      productImage: input.productImage,
      analysis: input.llmAnalysis,
      jewelleryType: input.jewelleryType,
      productTitle: input.productTitle
    });
  }

  /**
   * Executes FLUX.1 Kontext image editing request on fal.ai
   */
  async executeTryOnEdit(input: FluxKontextInput): Promise<VirtualTryOnProviderResult> {
    const startTime = Date.now();
    const apiKey = process.env.FAL_KEY;

    // 1. Environmental Key Validation
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      console.error('[FluxKontextProvider] Error: FAL_KEY environment variable is not configured.');
      throw new Error('FAL_KEY is missing from server environment. Please configure FAL_KEY.');
    }

    // Configure fal client with server-side key
    fal.config({ credentials: apiKey.trim() });

    const model = (process.env.FLUX_KONTEXT_MODEL || this.defaultModel).trim();

    // 2. Validate User Image Input
    if (!input.userImage) {
      throw new Error('User photograph is required for FLUX.1 Kontext image editing.');
    }

    const userImgSourceType = Buffer.isBuffer(input.userImage)
      ? 'buffer'
      : typeof input.userImage === 'string' && input.userImage.startsWith('data:')
      ? 'base64'
      : typeof input.userImage === 'string' && (input.userImage.startsWith('http://') || input.userImage.startsWith('https://'))
      ? 'url'
      : 'unknown';

    if (userImgSourceType === 'unknown') {
      throw new Error('Invalid user photograph format. Expected HTTP URL, data base64 URI, or Buffer.');
    }

    const productImgSourceType = input.productImage
      ? Buffer.isBuffer(input.productImage)
        ? 'buffer'
        : typeof input.productImage === 'string' && input.productImage.startsWith('data:')
        ? 'base64'
        : typeof input.productImage === 'string' && (input.productImage.startsWith('http://') || input.productImage.startsWith('https://'))
        ? 'url'
        : 'unknown'
      : 'none';

    // Safe Diagnostic Log (No sensitive payload/keys)
    console.log(
      `[FluxKontextProvider] Preparing Kontext request. Provider: fal.ai, Model: ${model}, UserImageSource: ${userImgSourceType}, ProductImageSource: ${productImgSourceType}`
    );

    // 3. Resolve actual user image URL (upload if base64/buffer)
    let userImageUrl: string;
    try {
      userImageUrl = await this.resolveImageUrl(input.userImage, 'user-photo.jpg');
    } catch (err: any) {
      console.error('[FluxKontextProvider] User photo upload/processing failed:', err?.message);
      throw new Error(`Failed to upload user photograph to fal storage: ${err?.message || 'Upload error'}`);
    }

    // 4. Resolve product image URL if product image present and multi-image model requested
    let productImageUrl: string | null = null;
    const isMultiImageModel = model.includes('multi');

    if (input.productImage && productImgSourceType !== 'unknown') {
      try {
        productImageUrl = await this.resolveImageUrl(input.productImage, 'product-photo.png');
      } catch (err: any) {
        console.warn('[FluxKontextProvider] Product photo upload failed (will rely on Gemini Vision prompt):', err?.message);
      }
    }

    // 5. Construct Editing Instruction Prompt
    const editingPrompt = input.prompt || buildKontextPrompt({
      jewelleryType: input.jewelleryType || 'item',
      productTitle: input.productTitle,
      llmAnalysis: input.analysis
    });

    // 6. Build API Payload
    const requestPayload: Record<string, any> = {
      prompt: editingPrompt,
    };

    if (isMultiImageModel && productImageUrl) {
      // Multi-image Kontext endpoint payload schema
      requestPayload.image_url = userImageUrl;
      requestPayload.image_urls = [userImageUrl, productImageUrl];
      requestPayload.reference_image_url = productImageUrl;
      console.log('[FluxKontextProvider] Using multi-image Kontext conditioning with both User & Product image references.');
    } else {
      // Standard FLUX.1 Kontext [dev] endpoint payload schema
      requestPayload.image_url = userImageUrl;
      if (input.productImage) {
        console.log('[FluxKontextProvider] Standard FLUX.1 Kontext [dev] endpoint: Primary base image is User Photo. Product details supplied via Gemini Vision prompt analysis.');
      }
    }

    // 7. Invoke fal.ai API
    try {
      console.log(`[FluxKontextProvider] Submitting request to fal.ai endpoint: ${model}...`);
      
      const response: any = await fal.subscribe(model, {
        input: requestPayload,
        logs: false
      });

      const duration = Date.now() - startTime;
      const requestId = response?.requestId || response?.request_id || response?.id || 'fal_req_' + Date.now();

      // Extract result image URL
      const resultUrl = this.extractImageFromFalResponse(response);

      if (!resultUrl) {
        console.error('[FluxKontextProvider] Fal API returned response without output image URL:', JSON.stringify(response).slice(0, 200));
        throw new Error('FLUX.1 Kontext API executed successfully but did not return an output image URL.');
      }

      console.log(
        `[FluxKontextProvider] SUCCESS: Kontext image edit complete! Model: ${model}, Duration: ${duration}ms, RequestId: ${requestId}`
      );

      return {
        imageUrl: resultUrl,
        processingTimeMs: duration,
        providerName: `FLUX.1 Kontext AI (${model})`,
        requestId,
        model,
        provider: 'fal.ai',
        llmAnalysis: input.analysis || undefined
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[FluxKontextProvider] ERROR: Kontext request failed after ${duration}ms. Model: ${model}, Error: ${err?.message || err}`
      );

      if (err?.message?.includes('TOP_UP') || err?.message?.includes('User is locked')) {
        throw new Error(
          'Your fal.ai account is locked due to zero credit balance (Reason: TOP_UP). Please add credits to your account at https://fal.ai/dashboard/billing.'
        );
      }
      if (err?.status === 401 || err?.message?.toLowerCase().includes('unauthorized') || err?.message?.toLowerCase().includes('api key')) {
        throw new Error('FAL_KEY authentication failed with fal.ai API. Please check your FAL_KEY in .env.');
      }
      if (err?.status === 403 || err?.message?.toLowerCase().includes('forbidden')) {
        throw new Error(
          'fal.ai API access forbidden (HTTP 403 - Account Locked / Zero Balance). Please add credits or verify your FAL_KEY at https://fal.ai/dashboard/billing.'
        );
      }
      if (err?.status === 429 || err?.message?.toLowerCase().includes('rate limit')) {
        throw new Error('fal.ai API rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`FLUX.1 Kontext API generation failed: ${err?.message || 'Unknown provider error'}`);
    }
  }

  /**
   * Converts a Base64 string, Buffer, or HTTP URL into a hosted HTTPS URL via fal.storage.upload
   */
  private async resolveImageUrl(image: string | Buffer, filename = 'image.jpg'): Promise<string> {
    // If already an HTTP/HTTPS URL, return as-is
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
      return image;
    }

    let buffer: Buffer;
    let mimeType = 'image/jpeg';

    if (Buffer.isBuffer(image)) {
      buffer = image;
    } else if (typeof image === 'string' && image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        throw new Error('Invalid base64 data URI format');
      }
    } else if (typeof image === 'string') {
      // Plain base64 string
      buffer = Buffer.from(image, 'base64');
    } else {
      throw new Error('Unsupported image input data type');
    }

    // Create a Blob for fal.storage.upload
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });

      const uploadResult: any = await fal.storage.upload(file);

      if (typeof uploadResult === 'string') {
        return uploadResult;
      }
      if (uploadResult?.url && typeof uploadResult.url === 'string') {
        return uploadResult.url;
      }
    } catch (uploadErr: any) {
      console.warn(
        `[FluxKontextProvider] Warning: fal.storage.upload failed (${uploadErr?.message || uploadErr}). Falling back to direct Base64 Data URI.`
      );
    }

    // Fallback: If image was already base64 or converted to buffer, return data URI directly
    if (typeof image === 'string' && image.startsWith('data:')) {
      return image;
    }
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  /**
   * Extracts output image URL from various fal.ai response structures
   */
  private extractImageFromFalResponse(response: any): string | null {
    if (!response) return null;

    // Check data object wrapper
    const data = response.data || response;

    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images[0].url || data.images[0];
    }
    if (data.image && data.image.url) {
      return data.image.url;
    }
    if (typeof data.image === 'string') {
      return data.image;
    }
    if (data.output && data.output.url) {
      return data.output.url;
    }
    if (data.url && typeof data.url === 'string') {
      return data.url;
    }

    return null;
  }
}
