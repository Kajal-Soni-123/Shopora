import assert from 'assert';
import { isGlbHeader, isTryOnEnabled, isValidTryOnModelUrl } from '../src/lib/try-on/tryOnModel';

function glbHeader(magic: number, version: number, length: number) {
  const bytes = new Uint8Array(12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, magic, true);
  view.setUint32(4, version, true);
  view.setUint32(8, length, true);
  return bytes;
}

function run() {
  const GLTF = 0x46546c67;
  assert.ok(isGlbHeader(glbHeader(GLTF, 2, 1000), 1000), 'valid glTF 2 header');
  assert.ok(!isGlbHeader(glbHeader(GLTF, 1, 1000), 1000), 'glTF 1 rejected');
  assert.ok(!isGlbHeader(glbHeader(0x12345678, 2, 1000), 1000), 'wrong magic rejected');
  assert.ok(!isGlbHeader(glbHeader(GLTF, 2, 5000), 1000), 'truncated file rejected');
  assert.ok(!isGlbHeader(new Uint8Array(4), 4), 'short file rejected');

  assert.ok(isValidTryOnModelUrl('/api/try-on/models/0123456789abcdef0123456789abcdef.glb'), 'stored model');
  assert.ok(!isValidTryOnModelUrl('/api/try-on/models/../../.env'), 'path traversal rejected');
  assert.ok(isValidTryOnModelUrl('https://cdn.example.com/watch.GLB'), 'external https glb');
  assert.ok(!isValidTryOnModelUrl('http://cdn.example.com/watch.glb'), 'plain http rejected');
  assert.ok(!isValidTryOnModelUrl('https://cdn.example.com/watch.png'), 'non-glb rejected');
  assert.ok(!isValidTryOnModelUrl('data:model/gltf-binary;base64,AAAA'), 'data URL rejected');

  assert.ok(isTryOnEnabled({ isTryOnAvailable: true, model3dUrl: '/api/try-on/models/x.glb' }), 'enabled with model');
  assert.ok(!isTryOnEnabled({ isTryOnAvailable: true, model3dUrl: null }), 'legacy enabled without model is hidden');
  assert.ok(!isTryOnEnabled({ isTryOnAvailable: false, model3dUrl: '/api/try-on/models/x.glb' }), 'disabled with model');
  assert.ok(!isTryOnEnabled(null), 'missing product');

  console.log('try_on_model: all assertions passed');
}

run();
