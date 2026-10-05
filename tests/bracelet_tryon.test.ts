import assert from 'assert';
import * as THREE from 'three';
import { getTryOnPlacement, getWristItem } from '../src/lib/try-on/tryOnModel';
import { autoAlignRotation, normalizeWristModel } from '../src/lib/try-on/ar/productModel';
import { WRIST_RADIUS_X, WRIST_RADIUS_Z } from '../src/lib/try-on/ar/wristScene';

function vertices(root: THREE.Object3D): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const out: THREE.Vector3[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  });
  return out;
}

/** Elliptical "radius" of a point relative to the wrist: 1 = on the wrist surface. */
const onWrist = (v: THREE.Vector3) => Math.hypot(v.x / WRIST_RADIUS_X, v.z / WRIST_RADIUS_Z);

function run() {
  // --- Watch vs bracelet ---
  assert.strictEqual(getWristItem({ tryOnCategory: 'BRACELET' }), 'bracelet');
  assert.strictEqual(getWristItem({ tryOnCategory: 'WATCH' }), 'watch');
  assert.strictEqual(getWristItem({ title: 'Gold Charm Bracelet' }), 'bracelet');
  assert.strictEqual(getWristItem({ title: 'Silver Kada' }), 'bracelet');
  assert.strictEqual(getWristItem({ title: 'Steel Chronograph Watch' }), 'watch');
  assert.strictEqual(getTryOnPlacement({ title: 'Silver Kada' }), 'wrist');
  assert.strictEqual(getTryOnPlacement({ title: 'Glass Bangles Set' }), 'wrist');
  console.log('✓ watch vs bracelet detection');

  // --- Flat chain bracelet: 18 x 0.8 x 0.3, laid out straight. A plain box has only 8 corners,
  //     so this also checks that long faces are split before bending. ---
  const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 0.3));
  const rotation = autoAlignRotation(strip);
  const wrapped = normalizeWristModel(strip, { rotation, scale: 1 }, 'bracelet');
  const points = vertices(wrapped);
  assert.ok(points.length > 200, `strip should be tessellated before bending, got ${points.length} vertices`);
  const radii = points.map(onWrist);
  assert.ok(Math.min(...radii) >= 1, `nothing inside the wrist, min ${Math.min(...radii).toFixed(3)}`);
  assert.ok(Math.max(...radii) < 1.4, `hugs the wrist, max ${Math.max(...radii).toFixed(3)}`);
  // All the way round: geometry in every direction around the wrist.
  const sectors = new Set(points.map((v) => Math.floor(((Math.atan2(v.z, v.x) + Math.PI) / (2 * Math.PI)) * 12) % 12));
  assert.strictEqual(sectors.size, 12, 'wraps all the way round');
  const width = new THREE.Box3().setFromObject(wrapped).getSize(new THREE.Vector3()).y;
  assert.ok(width > 0.004 && width < 0.012, `band width scales with length (~7 mm), got ${(width * 1000).toFixed(1)} mm`);
  assert.strictEqual(strip.geometry.getAttribute('position').count, 24, 'input geometry untouched');
  console.log('✓ flat bracelet wrapped around the wrist');

  // --- The same strip as a "watch" keeps the old flat-on-top behaviour ---
  const asWatch = normalizeWristModel(new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 0.3)), { rotation, scale: 1 }, 'watch');
  assert.ok(Math.min(...vertices(asWatch).map((v) => v.z)) >= WRIST_RADIUS_Z - 1e-9, 'watch rests on top of the wrist');
  console.log('✓ watches unchanged');

  // --- A bangle (closed loop) keeps its shape and is sized around the wrist ---
  const bangle = new THREE.Mesh(new THREE.TorusGeometry(3, 0.25, 12, 64));
  const bangleModel = normalizeWristModel(bangle, { rotation: autoAlignRotation(bangle), scale: 1 }, 'bracelet');
  const bangleSize = new THREE.Box3().setFromObject(bangleModel).getSize(new THREE.Vector3());
  assert.ok(Math.abs(bangleSize.x - 2 * (WRIST_RADIUS_X + 0.003)) < 1e-6, `bangle outer width, got ${bangleSize.x}`);
  assert.ok(bangleSize.y < bangleSize.x * 0.3, 'bangle ring axis along the arm');
  console.log('✓ bangle sized around the wrist');

  console.log('\nAll bracelet try-on tests passed.');
}

run();
