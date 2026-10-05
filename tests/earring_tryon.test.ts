import assert from 'assert';
import * as THREE from 'three';
import { getTryOnPlacement, supportsWristTryOn } from '../src/lib/try-on/tryOnModel';
import { autoAlignEarringRotation, isDangling, isolateSingleEarring, normalizeEarringModel } from '../src/lib/try-on/ar/earringModel';

function run() {
  // --- Placement detection ---
  assert.strictEqual(getTryOnPlacement({ tryOnCategory: 'EARRINGS' }), 'ear');
  assert.strictEqual(getTryOnPlacement({ tryOnCategory: 'WATCH' }), 'wrist');
  assert.strictEqual(getTryOnPlacement({ tryOnCategory: 'HAT' }), null, 'unsupported vendor category');
  assert.strictEqual(getTryOnPlacement({ title: 'Pearl Drop Earrings' }), 'ear');
  assert.strictEqual(getTryOnPlacement({ title: 'Gold Jhumka' }), 'ear');
  assert.strictEqual(getTryOnPlacement({ title: 'Silver Ear Cuff' }), 'ear', 'ear cuff is not a wrist cuff');
  assert.strictEqual(getTryOnPlacement({ title: 'Steel Watch' }), 'wrist');
  assert.strictEqual(getTryOnPlacement({ title: 'Cotton Shirt' }), null);
  assert.strictEqual(supportsWristTryOn({ title: 'Pearl Drop Earrings' }), false);
  console.log('✓ placement detection');

  // --- A drop earring: 1 unit wide, 3 tall, 0.2 deep, modelled lying on its side (long axis on X) ---
  const drop = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.2));
  const rotation = autoAlignEarringRotation(drop);
  const aligned = normalizeEarringModel(drop, { rotation, scale: 1 });
  const box = new THREE.Box3().setFromObject(aligned);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.y > size.x && size.x > size.z, `long axis should be vertical and thin axis front-to-back, got ${size.toArray()}`);
  assert.ok(Math.abs(size.x - 0.014) < 1e-6, `width should be 14 mm, got ${size.x}`);
  assert.ok(Math.abs(box.max.y) < 1e-9, 'top of the earring is the attachment point (y = 0)');
  assert.ok(Math.abs(box.min.x + box.max.x) < 1e-9 && Math.abs(box.min.z + box.max.z) < 1e-9, 'centred on the lobe');
  assert.strictEqual(isDangling(aligned), true);
  console.log('✓ drop earring aligned, sized and anchored at the top');

  // --- A stud: roughly round ---
  const stud = normalizeEarringModel(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2).rotateX(Math.PI / 2)));
  assert.strictEqual(isDangling(stud), false);
  console.log('✓ stud is not dangling');

  // --- Very long earrings are capped at 7 cm ---
  const long = normalizeEarringModel(new THREE.Mesh(new THREE.BoxGeometry(0.2, 10, 0.1)));
  const longSize = new THREE.Box3().setFromObject(long).getSize(new THREE.Vector3());
  assert.ok(longSize.y <= 0.07 + 1e-9, `length capped, got ${longSize.y}`);
  console.log('✓ length cap');

  // --- Pair in one file: keep one earring ---
  const pairOf = (geometry: () => THREE.BufferGeometry, gap: number) => {
    const group = new THREE.Group();
    const left = new THREE.Mesh(geometry());
    const right = new THREE.Mesh(geometry());
    const width = new THREE.Box3().setFromObject(left).getSize(new THREE.Vector3()).x;
    left.position.x = -(width + gap) / 2;
    right.position.x = (width + gap) / 2;
    group.add(left, right);
    return group;
  };
  const widthOf = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).x;

  const studPair = pairOf(() => new THREE.SphereGeometry(0.5, 16, 8), 0.6);
  const single = isolateSingleEarring(studPair);
  assert.ok(Math.abs(widthOf(single) - 1) < 1e-6, `stud pair should keep one 1-unit stud, got width ${widthOf(single)}`);
  assert.ok(widthOf(studPair) > 2, 'input must not be modified');
  console.log('✓ stud pair → one stud');

  // One merged mesh (as TRELLIS outputs): two tall drops side by side
  const merged = new THREE.Mesh(
    (() => {
      const a = new THREE.BoxGeometry(1, 3, 0.2, 2, 6, 1).translate(-0.9, 0, 0).toNonIndexed();
      const b = new THREE.BoxGeometry(1, 3, 0.2, 2, 6, 1).translate(0.9, 0, 0).toNonIndexed();
      const positions = new Float32Array(Array.from(a.attributes.position.array).concat(Array.from(b.attributes.position.array)));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return g;
    })()
  );
  const oneDrop = isolateSingleEarring(merged);
  assert.ok(Math.abs(widthOf(oneDrop) - 1) < 1e-6, `merged drop pair should keep one drop, got ${widthOf(oneDrop)}`);
  console.log('✓ merged mesh drop pair → one drop');

  // A single hoop has a hole in the middle but must not be split
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 12, 64));
  assert.strictEqual(isolateSingleEarring(hoop), hoop);
  console.log('✓ single hoop left intact');

  // Two different-sized parts are not a pair
  const mismatched = new THREE.Group();
  const big = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8));
  const small = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8));
  small.position.x = 2;
  mismatched.add(big, small);
  assert.strictEqual(isolateSingleEarring(mismatched), mismatched);
  console.log('✓ mismatched parts left intact');

  console.log('\nAll earring try-on tests passed.');
}

run();
