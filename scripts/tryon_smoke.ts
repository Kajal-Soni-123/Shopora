/**
 * Runs a real try-on against the configured Gemini image model and saves the result.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/tryon_smoke.ts <person-image> <product-image> "<product title>" [ITEM_TYPE]
 *
 * Images can be local file paths or http(s) URLs. Output is written next to the
 * person image as <name>.tryon.<ext>.
 */
import fs from 'fs';
import path from 'path';
import { GeminiImageTryOnProvider } from '../src/lib/try-on/providers/GeminiImageTryOnProvider';
import { detectWearableItem, WearableItemType } from '../src/lib/try-on/wearableItems';

function toSource(input: string): string {
  if (/^https?:\/\//.test(input)) return input;
  const ext = path.extname(input).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(input).toString('base64')}`;
}

async function main() {
  const [personPath, productPath, title = '', explicitType] = process.argv.slice(2);
  if (!personPath || !productPath) {
    console.error('Usage: npx tsx --env-file=.env scripts/tryon_smoke.ts <person> <product> "<title>" [ITEM_TYPE]');
    process.exit(1);
  }

  const itemType = detectWearableItem(explicitType, title) as WearableItemType;
  console.log(`Item type: ${itemType}`);

  const result = await new GeminiImageTryOnProvider().createJob({
    userImageUrl: toSource(personPath),
    productImageUrl: toSource(productPath),
    category: 'ACCESSORY',
    productId: 'smoke-test',
    userId: 'smoke-test',
    productTitle: title,
    itemType,
  });

  if (result.status !== 'COMPLETED' || !result.resultImageUrl) {
    console.error(`FAILED: ${result.errorMessage}`);
    process.exit(1);
  }

  const [, mime, b64] = result.resultImageUrl.match(/^data:image\/([a-z]+);base64,(.+)$/) || [];
  const base = /^https?:\/\//.test(personPath) ? path.join(process.cwd(), 'tryon-result') : personPath.replace(/\.[^.]+$/, '');
  const outPath = `${base}.tryon.${mime === 'jpeg' ? 'jpg' : mime || 'png'}`;
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log(`Saved: ${outPath}`);
}

main();
