import assert from 'assert';
import * as THREE from 'three';
import { measureForearm, type SkinMask } from '../src/lib/try-on/ar/wristMeasure';
import { autoAlignRotation, normalizeWristModel, parseFitting } from '../src/lib/try-on/ar/productModel';

/** A forearm band of skin 40 px wide, running from (100, 60) toward the bottom-left. */
function armMask(): { mask: SkinMask; axis: THREE.Vector2 } {
  const size = 200;
  const data = new Uint8Array(size * size);
  const origin = new THREE.Vector2(100, 60);
  const axis = new THREE.Vector2(-0.6, 0.8);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rel = new THREE.Vector2(x + 0.5, y + 0.5).sub(origin);
      const along = rel.dot(axis);
      const across = Math.abs(rel.x * -axis.y + rel.y * axis.x);
      if (along > -30 && across <= 20) data[y * size + x] = 2;
    }
  }
  return { mask: { data, width: size, height: size }, axis };
}

function run() {
  const { mask, axis } = armMask();
  // The hand landmark sits 8 px off the arm's centre line, and the hand points slightly off-axis.
  const offCentre = { x: 100 + 8 * 0.8, y: 60 + 8 * 0.6 };
  const handDirection = new THREE.Vector2(-0.5, 0.86).normalize();
  const forearm = measureForearm(mask, 200, 200, offCentre, handDirection, 1000, 0.015)!;
  assert.ok(forearm, 'forearm found');
  assert.ok(Math.abs(forearm.widthPx - 40) <= 2, `width measured: ${forearm.widthPx}`);
  const rel = new THREE.Vector2(forearm.centre.x - 100, forearm.centre.y - 60);
  assert.ok(Math.abs(rel.x * -axis.y + rel.y * axis.x) < 1.5, `centred on the arm: ${JSON.stringify(forearm.centre)}`);
  assert.ok(forearm.towardElbow.x * axis.x + forearm.towardElbow.y * axis.y > 0.99, 'direction follows the forearm');

  const empty: SkinMask = { data: new Uint8Array(100), width: 10, height: 10 };
  assert.strictEqual(measureForearm(empty, 200, 200, offCentre, handDirection, 1000, 0.015), null, 'no skin, no measurement');

  // A closed watch exported sideways: band wraps the X axis, case bulges out toward -Y.
  const watch = new THREE.Group();
  watch.add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 12, 96).rotateY(Math.PI / 2)));
  const watchCase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 64));
  watchCase.position.set(0, -0.036, 0);
  watch.add(watchCase);

  const rotation = autoAlignRotation(watch);
  const aligned = normalizeWristModel(watch, parseFitting({ rotation }));
  aligned.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(aligned).getSize(new THREE.Vector3());
  assert.ok(size.y < size.x && size.y < size.z, `band wraps the arm (Y): ${size.toArray()}`);
  const caseCentre = new THREE.Box3().setFromObject(watchCase).getCenter(new THREE.Vector3());
  assert.ok(caseCentre.z > 0.02, `case faces out (+Z): ${caseCentre.toArray()} for rotation ${rotation}`);

  console.log('wrist_fit: all assertions passed');
}

run();
