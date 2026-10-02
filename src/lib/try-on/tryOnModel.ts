/**
 * Rules for the per-product 3D model that powers "Try On Yourself".
 * Safe to import from both client components and API routes.
 */

export const MAX_TRY_ON_MODEL_BYTES = 20 * 1024 * 1024;

/** Uploaded models are served from this route (see src/app/api/try-on/models/[file]/route.ts). */
export const TRY_ON_MODEL_ROUTE = '/api/try-on/models';

export const TRY_ON_MODEL_REQUIRED_MESSAGE = 'A 3D model (.glb) is required to enable Try On Yourself.';

const STORED_MODEL_NAME = /^[a-f0-9]{32}\.glb$/;

export function isStoredModelName(name: string): boolean {
  return STORED_MODEL_NAME.test(name);
}

/** Accepts a model uploaded through Shopora, or an externally hosted https .glb link. */
export function isValidTryOnModelUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const value = url.trim();
  if (value.startsWith(`${TRY_ON_MODEL_ROUTE}/`)) {
    return isStoredModelName(value.slice(TRY_ON_MODEL_ROUTE.length + 1));
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.pathname.toLowerCase().endsWith('.glb');
  } catch {
    return false;
  }
}

/** Try-on is shown only when the vendor opted in and supplied a model. */
export function isTryOnEnabled(product: { isTryOnAvailable?: boolean | null; model3dUrl?: string | null } | null | undefined): boolean {
  return Boolean(product?.isTryOnAvailable && product.model3dUrl);
}

/** Checks the 12-byte binary glTF header: magic "glTF", version 2, declared length. */
export function isGlbHeader(bytes: Uint8Array, fileSize: number): boolean {
  if (bytes.length < 12) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, 12);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const declaredLength = view.getUint32(8, true);
  return magic === 0x46546c67 && version === 2 && declaredLength <= fileSize;
}

/**
 * Per-product alignment saved by the vendor (Product.model3dFitting).
 * `rotation` is in quarter turns about X, Y, Z, applied in that order.
 */
export interface ModelFitting {
  rotation: [number, number, number];
  scale: number;
}

export const DEFAULT_FITTING: ModelFitting = { rotation: [0, 0, 0], scale: 1 };

/** Accepts whatever is stored in the JSON column and returns a safe fitting. */
export function parseFitting(raw: unknown): ModelFitting {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<ModelFitting>;
  const turns = Array.isArray(value.rotation) && value.rotation.length === 3 ? value.rotation : [0, 0, 0];
  const rotation = turns.map((t) => (Number.isInteger(t) ? (((t as number) % 4) + 4) % 4 : 0)) as ModelFitting['rotation'];
  const scale = typeof value.scale === 'number' && value.scale >= 0.5 && value.scale <= 2 ? value.scale : 1;
  return { rotation, scale };
}

const WRIST_TYPES = new Set(['WATCH', 'BRACELET']);
const WRIST_KEYWORDS = /\b(watch|watches|wristwatch|smartwatch|bracelet|bangle|cuff|wristband)\b/i;

/**
 * Whether the 3D try-on can place this product. Only wrist items are supported for now.
 * The vendor's try-on category wins; otherwise the title and category name decide.
 */
export function supportsWristTryOn(product: {
  tryOnCategory?: string | null;
  title?: string;
  category?: { name?: string } | null;
}): boolean {
  if (product.tryOnCategory) return WRIST_TYPES.has(product.tryOnCategory.toUpperCase());
  return WRIST_KEYWORDS.test(`${product.title || ''} ${product.category?.name || ''}`);
}
