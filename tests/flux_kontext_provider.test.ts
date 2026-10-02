import assert from 'assert';
import { fal } from '@fal-ai/client';
import { FluxKontextProvider } from '../src/lib/virtual-try-on/providers/FluxKontextProvider';
import { buildKontextPrompt } from '../src/lib/virtual-try-on/kontextPromptBuilder';
import { GeminiVisionTryOnProvider } from '../src/lib/virtual-try-on/providers/GeminiVisionTryOnProvider';

// Mock helper to intercept fal.subscribe and fal.storage.upload
let lastSubscribedModel: string | null = null;
let lastSubscribeInput: any = null;
let mockSubscribeResponse: any = null;
let mockSubscribeError: Error | null = null;
let uploadedFiles: any[] = [];

// Override fal.subscribe and fal.storage.upload for mocking without real network calls
(fal as any).subscribe = async (model: string, options: any) => {
  lastSubscribedModel = model;
  lastSubscribeInput = options?.input;

  if (mockSubscribeError) {
    throw mockSubscribeError;
  }
  return mockSubscribeResponse || {
    requestId: 'mock-req-12345',
    data: {
      images: [{ url: 'https://v3.fal.media/result-edited-user-photo.jpg' }]
    }
  };
};

Object.defineProperty(fal, 'storage', {
  configurable: true,
  get: () => ({
    upload: async (file: any) => {
      uploadedFiles.push(file);
      return `https://v3.fal.media/uploaded-${uploadedFiles.length}-${file.name || 'file.jpg'}`;
    }
  })
});

async function runFluxKontextTests() {
  console.log('🧪 Starting FLUX.1 Kontext Provider Unit Tests...\n');

  const originalEnv = { ...process.env };

  try {
    // Reset test state before each test
    const resetMocks = () => {
      lastSubscribedModel = null;
      lastSubscribeInput = null;
      mockSubscribeResponse = null;
      mockSubscribeError = null;
      uploadedFiles = [];
    };

    // TEST 1: Missing FAL_KEY environment variable throws error
    console.log('Test 1: Missing FAL_KEY error handling');
    delete process.env.FAL_KEY;
    resetMocks();

    const provider1 = new FluxKontextProvider();
    await assert.rejects(
      async () => {
        await provider1.executeTryOnEdit({
          userImage: 'https://images.unsplash.com/photo-user.jpg',
          jewelleryType: 'WATCH'
        });
      },
      (err: Error) => {
        assert(err.message.includes('FAL_KEY is missing'), `Expected FAL_KEY error, got: ${err.message}`);
        return true;
      }
    );
    console.log('  ✅ Passed');

    // Setup valid FAL_KEY for subsequent tests
    process.env.FAL_KEY = 'mock_fal_key_test_12345';
    process.env.FLUX_KONTEXT_MODEL = 'fal-ai/flux-kontext/dev';

    // TEST 2: Missing user image throws error
    console.log('Test 2: Missing user image error handling');
    resetMocks();
    const provider2 = new FluxKontextProvider();
    await assert.rejects(
      async () => {
        await provider2.executeTryOnEdit({
          userImage: '',
          jewelleryType: 'WATCH'
        });
      },
      (err: Error) => {
        assert(err.message.includes('User photograph is required'), `Expected user photo error, got: ${err.message}`);
        return true;
      }
    );
    console.log('  ✅ Passed');

    // TEST 3: Successful Kontext request with HTTP User Image URL
    console.log('Test 3: Successful Kontext request with HTTP User Image URL');
    resetMocks();
    mockSubscribeResponse = {
      requestId: 'req-test-3-id',
      images: [{ url: 'https://v3.fal.media/output-edited-photo.png' }]
    };

    const provider3 = new FluxKontextProvider();
    const userPhotoUrl = 'https://images.unsplash.com/photo-user-test-3.jpg';
    const result3 = await provider3.executeTryOnEdit({
      userImage: userPhotoUrl,
      productTitle: 'Rolex Submariner',
      jewelleryType: 'WATCH'
    });

    assert.strictEqual(result3.imageUrl, 'https://v3.fal.media/output-edited-photo.png');
    assert.strictEqual(result3.requestId, 'req-test-3-id');
    assert.strictEqual(result3.model, 'fal-ai/flux-kontext/dev');
    assert.strictEqual(result3.provider, 'fal.ai');
    console.log('  ✅ Passed');

    // TEST 4: Assert correct model selected
    console.log('Test 4: Correct model selected');
    assert.strictEqual(lastSubscribedModel, 'fal-ai/flux-kontext/dev');
    console.log('  ✅ Passed');

    // TEST 5: Assert actual user image passed in request payload (image_url)
    console.log('Test 5: Assertion that actual user image is supplied as image_url');
    assert.strictEqual(lastSubscribeInput.image_url, userPhotoUrl);
    assert.strictEqual(typeof lastSubscribeInput.image_url, 'string');
    assert(lastSubscribeInput.image_url.length > 0, 'image_url must not be empty');
    console.log('  ✅ Passed (Confirmed user photo passed directly as image_url)');

    // TEST 6: Assert correct editing prompt passed containing identity preservation instructions
    console.log('Test 6: Editing prompt contains identity preservation instructions');
    const promptSent = lastSubscribeInput.prompt;
    assert(promptSent.includes('Edit the provided photograph rather than generating a new person'));
    assert(promptSent.includes('Preserve:'));
    assert(promptSent.includes('face'));
    assert(promptSent.includes('hairstyle'));
    assert(promptSent.includes('background'));
    console.log('  ✅ Passed');

    // TEST 7: Base64 User Image upload to fal storage
    console.log('Test 7: Base64 User Image uploaded to fal storage before sending to Kontext');
    resetMocks();
    const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
    
    const result7 = await provider3.executeTryOnEdit({
      userImage: dummyBase64,
      jewelleryType: 'WATCH'
    });

    assert.strictEqual(uploadedFiles.length, 1, 'Should upload base64 image to fal.storage');
    assert(lastSubscribeInput.image_url.startsWith('https://v3.fal.media/uploaded-1-user-photo.jpg'));
    console.log('  ✅ Passed (Base64 converted to fal.media HTTPS URL)');

    // TEST 8: Multi-image Kontext endpoint behavior (fal-ai/flux-pro/kontext/multi)
    console.log('Test 8: Multi-image Kontext model configuration (fal-ai/flux-pro/kontext/multi)');
    process.env.FLUX_KONTEXT_MODEL = 'fal-ai/flux-pro/kontext/multi';
    resetMocks();

    const result8 = await provider3.executeTryOnEdit({
      userImage: 'https://images.unsplash.com/user.jpg',
      productImage: 'https://images.unsplash.com/product-watch.jpg',
      jewelleryType: 'WATCH'
    });

    assert.strictEqual(lastSubscribedModel, 'fal-ai/flux-pro/kontext/multi');
    assert.strictEqual(lastSubscribeInput.image_url, 'https://images.unsplash.com/user.jpg');
    assert.strictEqual(lastSubscribeInput.reference_image_url, 'https://images.unsplash.com/product-watch.jpg');
    assert.deepStrictEqual(lastSubscribeInput.image_urls, [
      'https://images.unsplash.com/user.jpg',
      'https://images.unsplash.com/product-watch.jpg'
    ]);
    console.log('  ✅ Passed (Multi-image Kontext passed both user and product reference images)');

    // Restore standard model
    process.env.FLUX_KONTEXT_MODEL = 'fal-ai/flux-kontext/dev';

    // TEST 9: Provider error handling (e.g. 401 Unauthorized / Rate limit)
    console.log('Test 9: Provider error handling for API failures');
    resetMocks();
    mockSubscribeError = new Error('HTTP 401 Unauthorized: Invalid FAL_KEY');

    await assert.rejects(
      async () => {
        await provider3.executeTryOnEdit({
          userImage: 'https://images.unsplash.com/user.jpg',
          jewelleryType: 'WATCH'
        });
      },
      (err: Error) => {
        assert(err.message.includes('FAL_KEY authentication failed'), `Expected auth error, got: ${err.message}`);
        return true;
      }
    );
    console.log('  ✅ Passed');

    // TEST 10: Malformed provider response handling (missing output image)
    console.log('Test 10: Malformed provider response handling');
    resetMocks();
    mockSubscribeResponse = { requestId: 'req-malformed', data: {} };

    await assert.rejects(
      async () => {
        await provider3.executeTryOnEdit({
          userImage: 'https://images.unsplash.com/user.jpg',
          jewelleryType: 'WATCH'
        });
      },
      (err: Error) => {
        assert(err.message.includes('did not return an output image URL'), `Expected output error, got: ${err.message}`);
        return true;
      }
    );
    console.log('  ✅ Passed');

    // TEST 11: End-to-end GeminiVisionTryOnProvider Step 1 + Step 2 execution
    console.log('Test 11: GeminiVisionTryOnProvider integration test (Step 1 Vision + Step 2 Kontext)');
    resetMocks();
    mockSubscribeResponse = {
      requestId: 'req-gemini-step2-test',
      images: [{ url: 'https://v3.fal.media/final-tryon-result.jpg' }]
    };

    const geminiProvider = new GeminiVisionTryOnProvider();
    const fullResult = await geminiProvider.generateTryOn({
      userImage: 'https://images.unsplash.com/user.jpg',
      productImage: 'https://images.unsplash.com/product.jpg',
      jewelleryType: 'WATCH',
      productTitle: 'Luxury Chronograph'
    });

    assert.strictEqual(fullResult.imageUrl, 'https://v3.fal.media/final-tryon-result.jpg');
    assert.strictEqual(fullResult.provider, 'fal.ai');
    assert.strictEqual(fullResult.model, 'fal-ai/flux-kontext/dev');
    assert.strictEqual(lastSubscribeInput.image_url, 'https://images.unsplash.com/user.jpg');
    console.log('  ✅ Passed (GeminiVisionTryOnProvider successfully delegated Step 2 to FLUX Kontext)');

    // TEST 12: Verify Pollinations is NOT present or called
    console.log('Test 12: Assertion that Pollinations is completely absent');
    const modelStr: string = lastSubscribedModel || '';
    assert.strictEqual(modelStr.includes('pollinations'), false);
    assert.strictEqual((lastSubscribeInput?.prompt || '').includes('pollinations'), false);
    console.log('  ✅ Passed');

    console.log('\n🎉 All 12 FLUX.1 Kontext Provider Unit Tests Passed Successfully!\n');
  } finally {
    process.env = originalEnv;
  }
}

runFluxKontextTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
