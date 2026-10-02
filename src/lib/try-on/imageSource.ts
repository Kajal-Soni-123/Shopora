import fs from 'fs/promises';
import path from 'path';

export interface InlineImage {
  mimeType: string;
  data: string; // base64 without the data: prefix
}

const MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;

function mimeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Loads an image from a data URL, an http(s) URL or a path inside /public
 * and returns it as base64 for inline upload to an AI provider.
 */
export async function loadInlineImage(source: string): Promise<InlineImage> {
  const src = (source || '').trim();
  if (!src) throw new Error('Image source is empty.');

  if (src.startsWith('data:')) {
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error('Unsupported data URL image format.');
    return { mimeType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(), data: match[2] };
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Could not download image (HTTP ${res.status}).`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMAGE_BYTES) throw new Error('Image is too large (max 15MB).');
    const headerType = (res.headers.get('content-type') || '').split(';')[0].trim();
    const mimeType = headerType.startsWith('image/') ? headerType : mimeFromExtension(new URL(src).pathname);
    return { mimeType, data: buffer.toString('base64') };
  }

  // Relative path served from /public (e.g. "/images/products/ring.jpg")
  const publicDir = path.join(process.cwd(), 'public');
  const filePath = path.resolve(publicDir, src.replace(/^\/+/, ''));
  if (!filePath.startsWith(publicDir + path.sep)) {
    throw new Error('Invalid image path.');
  }
  const buffer = await fs.readFile(filePath);
  return { mimeType: mimeFromExtension(filePath), data: buffer.toString('base64') };
}
