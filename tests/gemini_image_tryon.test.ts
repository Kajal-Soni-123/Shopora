import assert from 'assert';
import { GeminiImageTryOnProvider } from '../src/lib/try-on/providers/GeminiImageTryOnProvider';
import { detectWearableItem, buildTryOnPrompt } from '../src/lib/try-on/wearableItems';

const PERSON = 'data:image/jpeg;base64,' + Buffer.from('person-photo').toString('base64');
const PRODUCT = 'data:image/png;base64,' + Buffer.from('product-photo').toString('base64');
const RESULT_B64 = Buffer.from('edited-photo').toString('base64');

let lastRequest: { url: string; body: any; headers: any } | null = null;
let mockResponses: Array<{ status: number; json?: any; text?: string }> = [];

(globalThis as any).fetch = async (url: string, init: any) => {
  lastRequest = { url, body: JSON.parse(init.body), headers: init.headers };
  const next = mockResponses.shift() || { status: 500, text: 'no mock' };
  return {
    ok: next.status >= 200 && next.status < 300,
    status: next.status,
    json: async () => next.json,
    text: async () => next.text ?? JSON.stringify(next.json ?? {}),
  };
};

function imageResponse() {
  return {
    status: 200,
    json: { candidates: [{ content: { parts: [{ text: 'Here you go' }, { inlineData: { mimeType: 'image/png', data: RESULT_B64 } }] } }] },
  };
}

const baseInput = {
  userImageUrl: PERSON,
  productImageUrl: PRODUCT,
  category: 'ACCESSORY' as const,
  productId: 'p1',
  userId: 'u1',
  productTitle: '18K Gold Diamond Solitaire Ring',
};

async function run() {
  // --- Item detection ---
  assert.strictEqual(detectWearableItem(null, 'Pearl Drop Earrings', 'Jewellery'), 'EARRINGS', 'earring must not match ring');
  assert.strictEqual(detectWearableItem(null, '18K Gold Solitaire Ring', 'Jewellery'), 'RING');
  assert.strictEqual(detectWearableItem(null, 'Classic Aviator Sunglasses', 'Accessories'), 'EYEWEAR');
  assert.strictEqual(detectWearableItem(null, 'Steel Chronograph', 'Accessories'), 'WATCH');
  assert.strictEqual(detectWearableItem(null, 'Gold Pendant', null), 'NECKLACE');
  assert.strictEqual(detectWearableItem(null, 'Slim Fit Jeans', 'Fashion'), 'BOTTOM');
  assert.strictEqual(detectWearableItem('DRESS', 'Silk Saree', null), 'DRESS');
  assert.strictEqual(detectWearableItem('SAREE', 'Anything', null), 'DRESS', 'explicit alias');
  assert.strictEqual(detectWearableItem(null, 'Mystery Item', 'Jewellery'), 'OTHER');
  assert.strictEqual(detectWearableItem(null, 'Mystery Item', 'Watches'), 'WATCH', 'falls back to category name');
  console.log('✓ item detection');

  // --- Prompt mentions the item and preservation rules ---
  const prompt = buildTryOnPrompt('RING', 'Solitaire');
  assert.ok(prompt.includes('ring finger'));
  assert.ok(prompt.includes('"Solitaire"'));
  assert.ok(prompt.includes("face and identity"));
  console.log('✓ prompt construction');

  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_IMAGE_MODEL;

  // --- Success: both images sent, image returned as data URL ---
  mockResponses = [imageResponse()];
  let provider = new GeminiImageTryOnProvider();
  let result = await provider.createJob({ ...baseInput, itemType: 'RING' });
  assert.strictEqual(result.status, 'COMPLETED');
  assert.strictEqual(result.resultImageUrl, `data:image/png;base64,${RESULT_B64}`);
  assert.ok(lastRequest!.url.endsWith('/gemini-2.5-flash-image:generateContent'));
  assert.strictEqual(lastRequest!.headers['x-goog-api-key'], 'test-key');
  const parts = lastRequest!.body.contents[0].parts;
  const inlineParts = parts.filter((p: any) => p.inlineData);
  assert.strictEqual(inlineParts.length, 2, 'both person and product images must be sent');
  assert.strictEqual(inlineParts[0].inlineData.mimeType, 'image/jpeg');
  assert.strictEqual(inlineParts[1].inlineData.mimeType, 'image/png');
  assert.deepStrictEqual(lastRequest!.body.generationConfig.responseModalities, ['TEXT', 'IMAGE']);
  console.log('✓ success path sends both images');

  // --- Text-only response is retried once ---
  mockResponses = [
    { status: 200, json: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'I cannot' }] } }] } },
    imageResponse(),
  ];
  result = await provider.createJob(baseInput);
  assert.strictEqual(result.status, 'COMPLETED');
  console.log('✓ retries when no image is returned');

  // --- Safety block is not retried ---
  mockResponses = [{ status: 200, json: { promptFeedback: { blockReason: 'SAFETY' } } }, imageResponse()];
  result = await provider.createJob(baseInput);
  assert.strictEqual(result.status, 'FAILED');
  assert.ok(/safety/i.test(result.errorMessage!));
  assert.strictEqual(mockResponses.length, 1, 'must not retry a safety block');
  console.log('✓ safety block fails without retry');

  // --- Quota error surfaces a clear message ---
  mockResponses = [{ status: 429, text: 'RESOURCE_EXHAUSTED' }];
  result = await provider.createJob(baseInput);
  assert.strictEqual(result.status, 'FAILED');
  assert.ok(/quota/i.test(result.errorMessage!));
  console.log('✓ quota error');

  // --- Model override ---
  process.env.GEMINI_IMAGE_MODEL = 'gemini-custom-image';
  provider = new GeminiImageTryOnProvider();
  mockResponses = [imageResponse()];
  await provider.createJob(baseInput);
  assert.ok(lastRequest!.url.includes('/gemini-custom-image:generateContent'));
  console.log('✓ GEMINI_IMAGE_MODEL override');

  // --- Missing key ---
  delete process.env.GEMINI_API_KEY;
  provider = new GeminiImageTryOnProvider();
  result = await provider.createJob(baseInput);
  assert.strictEqual(result.status, 'FAILED');
  assert.ok(result.errorMessage!.includes('GEMINI_API_KEY'));
  console.log('✓ missing API key');

  console.log('\nAll Gemini image try-on tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
