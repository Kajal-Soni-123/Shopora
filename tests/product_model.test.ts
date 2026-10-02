import assert from 'assert';
import * as THREE from 'three';
import { normalizeWristModel, supportsWristTryOn } from '../src/lib/try-on/ar/productModel';
import { WRIST_RADIUS_Z } from '../src/lib/try-on/ar/wristScene';
import { parseFitting } from '../src/lib/try-on/tryOnModel';

const close = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) < eps;

function boxOf(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

function run() {
  // A closed bracelet wrapping the Y axis, exported in millimetres and offset from the origin.
  const loop = new THREE.Mesh(new THREE.TorusGeometry(30, 3, 8, 32).rotateX(Math.PI / 2));
  loop.position.set(100, 50, 20);
  const loopBox = boxOf(normalizeWristModel(loop));
  const loopCentre = loopBox.getCenter(new THREE.Vector3());
  assert.ok(close(loopCentre.x, 0) && close(loopCentre.y, 0) && close(loopCentre.z, 0), 'closed loop centred on wrist axis');
  assert.ok(close(loopBox.getSize(new THREE.Vector3()).x, 0.06), 'mm loop sized to the wrist');

  // The same shape from an AI image-to-3D tool, normalised to a ~1-unit box, ends up the same size.
  const aiLoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 32).rotateX(Math.PI / 2));
  assert.ok(close(boxOf(normalizeWristModel(aiLoop)).getSize(new THREE.Vector3()).x, 0.06), 'unitless loop sized to the wrist');

  // A flat watch lying dial-up (+Y) with the strap along X: one quarter turn about X faces the dial out.
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 0.04));
  const flatBox = boxOf(normalizeWristModel(flat, parseFitting({ rotation: [1, 0, 0] })));
  const flatSize = flatBox.getSize(new THREE.Vector3());
  assert.ok(close(flatSize.y, 0.042) && close(flatSize.z, 0.0105), `case sized to a standard watch: ${flatSize.toArray()}`);
  assert.ok(close(flatBox.min.z, WRIST_RADIUS_Z), 'flat model rests on top of the wrist');

  assert.deepStrictEqual(parseFitting({ rotation: [5, -1, 2.5], scale: 9 }), { rotation: [1, 3, 0], scale: 1 }, 'fitting sanitised');
  assert.deepStrictEqual(parseFitting(null), { rotation: [0, 0, 0], scale: 1 }, 'missing fitting');

  assert.ok(supportsWristTryOn({ tryOnCategory: 'WATCH' }), 'watch category');
  assert.ok(!supportsWristTryOn({ tryOnCategory: 'RING', title: 'Ring that looks like a watch' }), 'vendor category wins');
  assert.ok(supportsWristTryOn({ title: 'Chrono Luxe Rose Gold Automatic Watch' }), 'watch title');
  assert.ok(supportsWristTryOn({ title: 'Silver Charm Bracelet' }), 'bracelet title');
  assert.ok(!supportsWristTryOn({ title: 'Diamond Stud Earrings', category: { name: 'Jewellery & Fine Accessories' } }), 'earrings not yet');

  console.log('product_model: all assertions passed');
}

run();
