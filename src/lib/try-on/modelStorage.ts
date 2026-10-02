import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { isStoredModelName, TRY_ON_MODEL_ROUTE } from './tryOnModel';

/**
 * Local-disk storage for vendor .glb models. Kept outside `public/` because Next.js only serves
 * public files that existed at build time. Swap this module for S3/Blob storage when deploying
 * to a host without a persistent filesystem.
 */
const MODELS_DIR = path.join(process.cwd(), 'uploads', 'models');

export async function saveTryOnModel(data: Buffer): Promise<string> {
  await fs.mkdir(MODELS_DIR, { recursive: true });
  const name = `${randomBytes(16).toString('hex')}.glb`;
  await fs.writeFile(path.join(MODELS_DIR, name), data);
  return `${TRY_ON_MODEL_ROUTE}/${name}`;
}

export async function readTryOnModel(name: string): Promise<Buffer | null> {
  if (!isStoredModelName(name)) return null;
  try {
    return await fs.readFile(path.join(MODELS_DIR, name));
  } catch {
    return null;
  }
}
