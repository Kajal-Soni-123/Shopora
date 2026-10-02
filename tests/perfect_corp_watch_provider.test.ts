import assert from 'assert';
import { PerfectCorpWatchProvider } from '../src/lib/virtual-try-on/providers/PerfectCorpWatchProvider';
import { VirtualTryOnService } from '../src/lib/virtual-try-on/VirtualTryOnService';

// Store original fetch & env
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function setupMockFetch(mockResponseHandler: (url: string, opts: any) => Promise<{ status: number; data: any }>) {
  global.fetch = (async (url: any, opts: any) => {
    const res = await mockResponseHandler(String(url), opts);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      statusText: res.status === 200 ? 'OK' : 'Error',
      text: async () => typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      json: async () => typeof res.data === 'string' ? JSON.parse(res.data) : res.data,
    } as Response;
  }) as any;
}

function resetEnv() {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
}

async function runTests() {
  console.log('🧪 Starting Official Two-Step Presigned S2S File Upload & Watch VTO Unit Tests...\n');

  // Test 1: Missing PERFECT_CORP_API_KEY error handling
  try {
    delete process.env.PERFECT_CORP_API_KEY;
    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown error for missing PERFECT_CORP_API_KEY');
  } catch (err: any) {
    assert(err.message.includes('PERFECT_CORP_API_KEY is missing'), 'Test 1 Passed');
    console.log('Test 1: Missing PERFECT_CORP_API_KEY error handling');
    console.log('  ✅ Passed');
  }

  // Test 2: Missing user image error handling
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: '',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown error for missing user image');
  } catch (err: any) {
    assert(err.message.includes('User photograph is required'), 'Test 2 Passed');
    console.log('Test 2: Missing user image error handling');
    console.log('  ✅ Passed');
  }

  // Test 3: Missing product image error handling
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: ''
    });
    assert.fail('Should have thrown error for missing product image');
  } catch (err: any) {
    assert(err.message.includes('Product watch photograph is required'), 'Test 3 Passed');
    console.log('Test 3: Missing product image error handling');
    console.log('  ✅ Passed');
  }

  // Test 4: Successful 2D Watch Task Creation & Polling (URL-based inputs)
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    let taskCreated = false;
    let taskPolled = false;
    let capturedTaskPayload: any = {};
    let capturedHeaders: any = {};

    setupMockFetch(async (url, opts) => {
      capturedHeaders = opts.headers;
      if (url.includes('/s2s/v2.0/task/2d-vto/watch') && opts.method === 'POST') {
        taskCreated = true;
        capturedTaskPayload = JSON.parse(opts.body);
        return {
          status: 200,
          data: {
            status: 'success',
            task_id: 'task_watch_990011',
            polling_interval: 10
          }
        };
      }
      if (url.includes('/task/2d-vto/watch/task_watch_990011')) {
        taskPolled = true;
        return {
          status: 200,
          data: {
            task_status: 'success',
            result_url: 'https://cdn.makeupar.com/result/watch_vto_out.jpg'
          }
        };
      }
      return { status: 404, data: { error: 'Not found' } };
    });

    const provider = new PerfectCorpWatchProvider();
    const result = await provider.generateTryOn({
      userImageUrl: 'https://cdn.example.com/wrist_user.jpg',
      productImageUrl: 'https://cdn.example.com/watch_item.png'
    });

    assert(taskCreated, 'Task should have been created via POST /s2s/v2.0/task/2d-vto/watch');
    assert(taskPolled, 'Task should have been polled via GET /s2s/v2.0/task/2d-vto/watch/{task_id}');
    assert.strictEqual(capturedTaskPayload.src_file_url, 'https://cdn.example.com/wrist_user.jpg');
    assert.strictEqual(capturedTaskPayload.ref_file_urls[0], 'https://cdn.example.com/watch_item.png');
    assert.strictEqual(capturedTaskPayload.source_info.name, 'https://cdn.example.com/wrist_user.jpg');
    assert.strictEqual(capturedTaskPayload.object_infos[0].name, 'https://cdn.example.com/watch_item.png');
    assert.strictEqual(capturedTaskPayload.object_infos[0].parameter.watch_need_remove_background, true);
    assert.strictEqual(capturedHeaders['Authorization'], 'Bearer test_pc_key_12345');
    assert.strictEqual(result.resultImageUrl, 'https://cdn.makeupar.com/result/watch_vto_out.jpg');
    assert.strictEqual(result.resultId, 'task_watch_990011');

    console.log('Test 4: Official 2D Watch Task Creation & Polling (URL-based)');
    console.log('  ✅ Passed (src_file_url, ref_file_urls, task_id polling, Bearer auth verified)');
  } catch (err: any) {
    console.error('Test 4 Failed:', err);
    assert.fail(err);
  }

  // Test 5: Two-Step Presigned S2S File API Upload for Base64 inputs
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    let step1MetadataCalled = false;
    let step2BinaryPutCalled = false;
    let capturedStep1Payload: any = {};
    let capturedTaskPayload: any = {};

    setupMockFetch(async (url, opts) => {
      // Step 1: POST Metadata JSON to https://yce-api-01.makeupar.com/s2s/v2.0/file
      if (url.includes('/s2s/v2.0/file') && opts.method === 'POST') {
        step1MetadataCalled = true;
        capturedStep1Payload = JSON.parse(opts.body);
        return {
          status: 200,
          data: {
            status: 200,
            data: {
              files: [
                {
                  file_id: 'file_presigned_9988',
                  requests: [
                    {
                      method: 'PUT',
                      url: 'https://s3.amazonaws.com/perfectcorp-uploads/user_wrist.jpg?presigned=true',
                      headers: {
                        'Content-Type': 'image/jpeg',
                        'Content-Length': '23'
                      }
                    }
                  ]
                }
              ]
            }
          }
        };
      }

      // Step 2: PUT Binary Image Bytes to presigned S3 URL
      if (url.includes('perfectcorp-uploads') && opts.method === 'PUT') {
        step2BinaryPutCalled = true;
        assert(Buffer.isBuffer(opts.body) || opts.body instanceof Uint8Array, 'Body of presigned PUT must be binary Buffer');
        return {
          status: 200,
          data: 'OK'
        };
      }

      // Watch VTO Task Creation
      if (url.includes('/s2s/v2.0/task/2d-vto/watch') && opts.method === 'POST') {
        capturedTaskPayload = JSON.parse(opts.body);
        return {
          status: 200,
          data: { task_id: 'task_twostep_101', polling_interval: 10 }
        };
      }

      // Watch VTO Polling
      if (url.includes('task_twostep_101')) {
        return {
          status: 200,
          data: { task_status: 'success', result_url: 'https://cdn.makeupar.com/result/twostep_out.jpg' }
        };
      }

      return { status: 404, data: {} };
    });

    const provider = new PerfectCorpWatchProvider();
    const result = await provider.generateTryOn({
      userImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD', // 23 bytes
      productImageUrl: 'https://cdn.example.com/watch.png'
    });

    assert(step1MetadataCalled, 'Step 1: POST Metadata JSON must be executed');
    assert(step2BinaryPutCalled, 'Step 2: PUT binary Buffer must be executed');
    assert.strictEqual(capturedStep1Payload.files[0].content_type, 'image/jpeg');
    assert.strictEqual(capturedStep1Payload.files[0].file_size, 20);
    assert.strictEqual(capturedTaskPayload.src_file_id, 'file_presigned_9988');
    assert.strictEqual(capturedTaskPayload.ref_file_urls[0], 'https://cdn.example.com/watch.png');
    assert.strictEqual(result.resultImageUrl, 'https://cdn.makeupar.com/result/twostep_out.jpg');

    console.log('Test 5: Two-Step Presigned S2S File API Upload for Base64 inputs');
    console.log('  ✅ Passed (Step 1 POST JSON metadata -> Step 2 PUT binary Buffer -> Watch VTO task with src_file_id)');
  } catch (err: any) {
    console.error('Test 5 Failed:', err);
    assert.fail(err);
  }

  // Test 6: Documented Error Code Handling (PHOTO_DETECTION_FAIL)
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    setupMockFetch(async (url, opts) => {
      if (opts.method === 'POST') {
        return {
          status: 200,
          data: { task_id: 'task_fail_99', polling_interval: 10 }
        };
      }
      return {
        status: 200,
        data: {
          task_status: 'error',
          error_code: 'PHOTO_DETECTION_FAIL',
          error: { message: 'Failed to detect wrist' }
        }
      };
    });

    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown PHOTO_DETECTION_FAIL error');
  } catch (err: any) {
    assert(err.message.includes('Could not detect a hand or wrist'), 'Test 6 Passed');
    console.log('Test 6: Documented PHOTO_DETECTION_FAIL error code handling');
    console.log('  ✅ Passed');
  }

  // Test 7: Perfect Corp 401 Authentication Error
  try {
    process.env.PERFECT_CORP_API_KEY = 'invalid_key';
    setupMockFetch(async () => {
      return {
        status: 401,
        data: { error: { message: 'Unauthorized: Invalid Bearer token' } }
      };
    });

    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown authentication error');
  } catch (err: any) {
    assert(err.message.includes('authentication failed'), 'Test 7 Passed');
    console.log('Test 7: Perfect Corp 401/403 Authentication error handling');
    console.log('  ✅ Passed');
  }

  // Test 8: Integration with VirtualTryOnService for WATCH category
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    delete process.env.VIRTUAL_TRY_ON_PROVIDER;

    setupMockFetch(async (url, opts) => {
      if (opts.method === 'POST') {
        return { status: 200, data: { task_id: 'task_service_77', polling_interval: 10 } };
      }
      return {
        status: 200,
        data: { task_status: 'success', result_url: 'https://cdn.makeupar.com/result/service_out.png' }
      };
    });

    const service = VirtualTryOnService.getInstance();
    const result = await service.generateTryOn({
      userImage: 'https://example.com/user.jpg',
      productImage: 'https://example.com/watch.png',
      jewelleryType: 'WATCH',
      productId: 'prod_watch_101',
      productTitle: 'Luxury Chronograph'
    });

    assert.strictEqual(result.imageUrl, 'https://cdn.makeupar.com/result/service_out.png');
    assert.strictEqual(result.providerName, 'Perfect Corp AI Watch Virtual Try-On');
    console.log('Test 8: VirtualTryOnService WATCH routing to Perfect Corp');
    console.log('  ✅ Passed (WATCH category routed directly to PerfectCorpWatchProvider)');
  } catch (err: any) {
    console.error('Test 8 Failed:', err);
    assert.fail(err);
  }

  // Test 9: Strict isolation (No old endpoints or fallback generators)
  try {
    const fs = await import('fs');
    const path = await import('path');

    const providerContent = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/virtual-try-on/providers/PerfectCorpWatchProvider.ts'),
      'utf8'
    );

    assert(!providerContent.includes('yce-api.perfectcorp.com'), 'Must not contain old unresolvable domain yce-api.perfectcorp.com');
    assert(!providerContent.includes('pollinations'), 'Must not contain pollinations');
    assert(!providerContent.includes('fal.ai'), 'Must not contain fal.ai');
    assert(!providerContent.includes('gemini'), 'Must not contain gemini');

    console.log('Test 9: Strict isolation (Old endpoint removed, no silent fallback to FLUX/Pollinations)');
    console.log('  ✅ Passed');
  } catch (err: any) {
    console.error('Test 9 Failed:', err);
    assert.fail(err);
  }

  // Test 10: Connection Timeout Handling
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    global.fetch = (async () => {
      const err = new Error('fetch failed');
      (err as any).code = 'UND_ERR_CONNECT_TIMEOUT';
      throw err;
    }) as any;

    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown connection timeout error');
  } catch (err: any) {
    assert(err.message.includes('connection timed out'), 'Test 10 Passed');
    console.log('Test 10: Connection timeout error handling');
    console.log('  ✅ Passed');
  }

  // Test 11: Real Engine Error Response Handling (error: "2", error_message: "No hand detected.")
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    setupMockFetch(async (url, opts) => {
      if (opts.method === 'POST') {
        return {
          status: 200,
          data: { task_id: 'task_nohand_22', polling_interval: 10 }
        };
      }
      return {
        status: 200,
        data: {
          status: 200,
          data: {
            error: '2',
            error_message: 'No hand detected.',
            results: null,
            task_status: 'error'
          }
        }
      };
    });

    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown No hand detected error');
  } catch (err: any) {
    assert(err.message.includes('Could not detect a hand or wrist in your photograph'), 'Test 11 Passed');
    console.log('Test 11: Perfect Corp engine error: "2" ("No hand detected.") error handling');
    console.log('  ✅ Passed');
  }

  // Test 12: Engine Error 4 (Wrist should be in the correct pose.)
  try {
    process.env.PERFECT_CORP_API_KEY = 'test_pc_key_12345';
    setupMockFetch(async (url, opts) => {
      if (opts.method === 'POST') {
        return {
          status: 200,
          data: { task_id: 'task_pose_44', polling_interval: 10 }
        };
      }
      return {
        status: 200,
        data: {
          status: 200,
          data: {
            error: '4',
            error_message: 'Wrist should be in the correct pose.',
            results: null,
            task_status: 'error'
          }
        }
      };
    });

    const provider = new PerfectCorpWatchProvider();
    await provider.generateTryOn({
      userImageUrl: 'https://example.com/user.jpg',
      productImageUrl: 'https://example.com/watch.png'
    });
    assert.fail('Should have thrown Wrist pose error');
  } catch (err: any) {
    assert(err.message.includes('The wrist in your photograph is angled or partially cut off'), 'Test 12 Passed');
    console.log('Test 12: Perfect Corp engine error: "4" ("Wrist should be in the correct pose.") error handling');
    console.log('  ✅ Passed');
  }

  resetEnv();
  console.log('\n🎉 All 12 Two-Step Presigned File API & Watch VTO Unit Tests Passed Successfully!');
}

runTests().catch((err) => {
  console.error('Unit tests failed:', err);
  process.exit(1);
});
