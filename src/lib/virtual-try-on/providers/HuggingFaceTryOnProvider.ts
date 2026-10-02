import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  VirtualTryOnProvider,
  VirtualTryOnInput,
  VirtualTryOnProviderResult
} from '../types';
import { GeminiVisionTryOnProvider } from './GeminiVisionTryOnProvider';
import { Client, handle_file } from '@gradio/client';

function base64ToTmpFile(base64Data: string, prefix: string): { filePath: string; cleanup: () => void } {
  try {
    if (!base64Data) return { filePath: '', cleanup: () => {} };
    let ext = 'png';
    if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) {
      ext = 'jpg';
    }
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const tmpPath = path.join(os.tmpdir(), `vton_${prefix}_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, buffer);
    return {
      filePath: tmpPath,
      cleanup: () => {
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch (e) {}
      }
    };
  } catch (e) {
    return { filePath: '', cleanup: () => {} };
  }
}

export class HuggingFaceTryOnProvider implements VirtualTryOnProvider {
  name = 'Hugging Face IDM-VTON Photorealistic AI Studio';
  private apiKey: string;
  private geminiFallback: GeminiVisionTryOnProvider;

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
    this.geminiFallback = new GeminiVisionTryOnProvider();
  }

  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      console.log('[HuggingFaceTryOnProvider] HUGGINGFACE_API_KEY not set, using Gemini Provider.');
      return this.geminiFallback.generateTryOn(input);
    }

    const category = (input.jewelleryType || '').toUpperCase().trim();
    const isGarmentCategory = ['CLOTHING', 'TOP', 'SHIRT', 'DRESS', 'JACKET', 'PANTS', 'APPAREL'].includes(category);

    if (!isGarmentCategory) {
      console.log(
        `[HuggingFaceTryOnProvider] Category "${category}" is an accessory/jewellery item. Delegating to Gemini Vision AI Studio for anatomical landmark precision...`
      );
      return this.geminiFallback.generateTryOn(input);
    }

    let userImgSrc = typeof input.userImage === 'string' ? input.userImage : '';
    if (Buffer.isBuffer(input.userImage)) {
      userImgSrc = `data:image/jpeg;base64,${input.userImage.toString('base64')}`;
    }

    let productImgSrc = typeof input.productImage === 'string' ? input.productImage : '';
    if (Buffer.isBuffer(input.productImage)) {
      productImgSrc = `data:image/png;base64,${input.productImage.toString('base64')}`;
    }

    console.log(
      `[HuggingFaceTryOnProvider] Initiating IDM-VTON photorealistic synthesis for: ${
        input.productTitle || input.productId || 'product'
      }`
    );

    const userFile = base64ToTmpFile(userImgSrc, 'user');
    const garmFile = base64ToTmpFile(productImgSrc, 'garm');

    try {
      const maxAttempts = 3;
      const timeoutMs = 120000; // 2 minutes timeout limit

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[HuggingFaceTryOnProvider] Attempt ${attempt}/${maxAttempts}: Connecting to Hugging Face IDM-VTON space...`);

        try {
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs / maxAttempts));

          const gradioTask = (async () => {
            try {
              const app = await Client.connect('yisol/IDM-VTON', { token: this.apiKey as any });

              let backgroundInput: any = userImgSrc;
              let garmInput: any = productImgSrc;

              try {
                if (typeof handle_file === 'function' && userFile.filePath && garmFile.filePath) {
                  backgroundInput = handle_file(userFile.filePath);
                  garmInput = handle_file(garmFile.filePath);
                }
              } catch (e) {
                // fallback to raw strings if handle_file fails
              }

              const result = await app.predict('/tryon', [
                { background: backgroundInput, layers: [], composite: backgroundInput },
                garmInput,
                input.productTitle || input.jewelleryType || 'garment',
                true,
                true,
                30,
                42
              ]);

              if (result && (result as any).data) {
                const dataArr = (result as any).data;
                const resUrl = Array.isArray(dataArr) ? dataArr[0]?.url || dataArr[0] : dataArr;
                if (resUrl && typeof resUrl === 'string') {
                  console.log(`[HuggingFaceTryOnProvider] IDM-VTON synthesis completed successfully on attempt ${attempt}!`);
                  return {
                    imageUrl: resUrl,
                    processingTimeMs: Date.now() - startTime,
                    providerName: 'Hugging Face (yisol/IDM-VTON)'
                  };
                }
              }
            } catch (err: any) {
              console.warn(`[HuggingFaceTryOnProvider] Space note (attempt ${attempt}):`, err?.message || err);
            }
            return null;
          })();

          const hfResult = await Promise.race([gradioTask, timeoutPromise]);
          if (hfResult) {
            return hfResult;
          }
        } catch (err: any) {
          console.warn(`[HuggingFaceTryOnProvider] Attempt ${attempt} exception:`, err?.message || err);
        }

        if (attempt < maxAttempts) {
          console.log(`[HuggingFaceTryOnProvider] Hugging Face Space is warming up model weights... waiting 10s before retry ${attempt + 1}/${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }

      console.log('[HuggingFaceTryOnProvider] HF IDM-VTON space unreachable after 2 minutes. Falling back to Gemini Vision AI Studio...');
      return this.geminiFallback.generateTryOn(input);
    } finally {
      userFile.cleanup();
      garmFile.cleanup();
    }
  }
}
