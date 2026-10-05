import type { SkinMask } from './wristMeasure';

/** Phone photos can be 12+ MP; capping keeps detection and WebGL fast without visible quality loss. */
const MAX_PHOTO_SIDE = 2048;
/** Small photos are enlarged to this so the jewellery is rendered crisp instead of pixelated. */
const MIN_RENDER_SIDE = 1600;

/** Scale at which to process a customer photo: shrinks huge ones, enlarges small ones. */
export function photoRenderScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return 1;
  return Math.min(MAX_PHOTO_SIDE / longest, Math.max(1, MIN_RENDER_SIDE / longest));
}

/** selfie_multiclass_256x256 category for hair. */
export const HAIR = 1;

/** Draws only the photo's hair pixels onto `target` (same size as the photo), the rest transparent. */
export function drawHairLayer(photo: HTMLCanvasElement, mask: SkinMask | null, target: HTMLCanvasElement) {
  const { width, height } = target;
  const ctx = target.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, width, height);
  if (!mask) return;
  ctx.drawImage(photo, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    const my = Math.min(mask.height - 1, Math.floor((y / height) * mask.height));
    for (let x = 0; x < width; x++) {
      const mx = Math.min(mask.width - 1, Math.floor((x / width) * mask.width));
      if (mask.data[my * mask.width + mx] !== HAIR) pixels.data[(y * width + x) * 4 + 3] = 0;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

/**
 * White-on-black mask of wherever `render` (a transparent WebGL canvas) drew something, grown by
 * roughly `growPx` so an AI pass can blend the edges. Uses alpha, so dark metal counts as much as gold.
 */
export function grownSilhouetteMask(render: CanvasImageSource, width: number, height: number, growPx: number): HTMLCanvasElement {
  const silhouette = document.createElement('canvas');
  silhouette.width = width;
  silhouette.height = height;
  const sctx = silhouette.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(render, 0, 0);
  const shape = sctx.getImageData(0, 0, width, height);
  for (let i = 0; i < shape.data.length; i += 4) {
    const covered = shape.data[i + 3] > 8;
    shape.data[i] = shape.data[i + 1] = shape.data[i + 2] = 255;
    shape.data[i + 3] = covered ? 255 : 0;
  }
  sctx.putImageData(shape, 0, 0);

  // Blur then threshold = dilation by roughly the blur radius.
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = `blur(${growPx}px)`;
  ctx.drawImage(silhouette, 0, 0);
  ctx.filter = 'none';
  const grown = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < grown.data.length; i += 4) {
    const value = grown.data[i] > 10 ? 255 : 0;
    grown.data[i] = grown.data[i + 1] = grown.data[i + 2] = value;
    grown.data[i + 3] = 255;
  }
  ctx.putImageData(grown, 0, 0);
  return mask;
}

/** Draws a transparent product render onto the photo with a soft contact shadow, so it doesn't float. */
export function drawWithContactShadow(ctx: CanvasRenderingContext2D, render: CanvasImageSource, pixelsPerMeter: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.max(2, 0.0015 * pixelsPerMeter);
  ctx.shadowOffsetY = Math.max(1, 0.001 * pixelsPerMeter);
  ctx.drawImage(render, 0, 0);
  ctx.restore();
}
