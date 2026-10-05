export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { isTryOnEnabled } from '@/lib/try-on/tryOnModel';

/**
 * Proxies the optional "AI photoreal" step to Shopora's own try-on model server
 * (ml/watch-tryon/serve_tryon.ipynb). Off unless TRYON_ENHANCE_URL and TRYON_ENHANCE_KEY are set.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 120_000;

// Each call costs GPU time; a simple per-IP window keeps one visitor from monopolising it.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const recentRequests = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (recentRequests.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    recentRequests.set(key, recent);
    return true;
  }
  recent.push(now);
  recentRequests.set(key, recent);
  return false;
}

function enhanceConfig() {
  const url = process.env.TRYON_ENHANCE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.TRYON_ENHANCE_KEY?.trim();
  return url && key ? { url, key } : null;
}

// GET /api/try-on/enhance - Whether the AI photoreal step is configured
export async function GET() {
  return ApiResponse.success({ available: enhanceConfig() !== null });
}

// POST /api/try-on/enhance - Repaint the wrist area of a try-on result with the custom model
export async function POST(request: Request) {
  const config = enhanceConfig();
  if (!config) {
    return ApiResponse.error('AI photoreal try-on is not configured.', 503);
  }

  const clientKey = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (isRateLimited(clientKey)) {
    return ApiResponse.tooManyRequests('Too many photoreal requests. Please try again in a few minutes.');
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const mask = formData.get('mask');
    const productId = formData.get('productId');
    if (!(image instanceof File) || !(mask instanceof File) || typeof productId !== 'string') {
      return ApiResponse.badRequest('Send the try-on image, its mask and the productId.');
    }
    if (image.size > MAX_UPLOAD_BYTES || mask.size > MAX_UPLOAD_BYTES) {
      return ApiResponse.badRequest('Image is too large.');
    }
    if (!image.type.startsWith('image/') || !mask.type.startsWith('image/')) {
      return ApiResponse.badRequest('Image and mask must be image files.');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { title: true, isTryOnAvailable: true, model3dUrl: true },
    });
    if (!product || !isTryOnEnabled(product)) {
      return ApiResponse.badRequest('Try On Yourself is not available for this product.');
    }

    const upstreamForm = new FormData();
    upstreamForm.append('image', image, 'composite.jpg');
    upstreamForm.append('mask', mask, 'mask.png');
    upstreamForm.append('product', product.title);

    const upstream = await fetch(`${config.url}/enhance`, {
      method: 'POST',
      headers: { 'x-api-key': config.key },
      body: upstreamForm,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      console.error('[TryOnEnhance] Model server responded', upstream.status, await upstream.text().catch(() => ''));
      return ApiResponse.error('The AI model could not process this photo. Please try again.', 502);
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('[TryOnEnhance] Error:', error);
    return ApiResponse.error(
      timedOut ? 'The AI model took too long to respond. Please try again.' : 'AI photoreal try-on failed.',
      timedOut ? 504 : 502
    );
  }
}
