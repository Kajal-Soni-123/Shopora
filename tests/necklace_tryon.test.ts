import assert from 'assert';
import * as THREE from 'three';
import { getTryOnPlacement } from '../src/lib/try-on/tryOnModel';
import { autoAlignNecklaceRotation, isClosedNecklace, normalizeNecklaceModel } from '../src/lib/try-on/ar/necklaceModel';

function run() {
  // --- Placement detection, including a store category named "Necklace" ---
  assert.strictEqual(getTryOnPlacement({ tryOnCategory: 'NECKLACE' }), 'neck');
  assert.strictEqual(getTryOnPlacement({ title: 'Royal Gold Set', category: { name: 'Necklace' } }), 'neck');
  assert.strictEqual(getTryOnPlacement({ title: 'Royal Gold Set', category: { name: 'Necklaces' } }), 'neck');
  assert.strictEqual(getTryOnPlacement({ title: 'Diamond Pendant' }), 'neck');
  assert.strictEqual(getTryOnPlacement({ title: 'Silver Chain Bracelet' }), 'wrist', 'chain bracelet is a bracelet');
  assert.strictEqual(getTryOnPlacement({ title: 'Pearl Drop Earrings' }), 'ear');
  console.log('✓ placement detection');

  // --- Flat front-view necklace: a U-shaped chain with a heavy pendant at the bottom, modelled upside down ---
  const flat = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48, Math.PI));
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16));
  pendant.position.y = 1.1; // upside down: pendant on top
  chain.rotation.z = 0; // arc spans the top half, so the open end points down
  flat.add(chain, pendant);
  const flatRotation = autoAlignNecklaceRotation(flat);
  const flatModel = normalizeNecklaceModel(flat, { rotation: flatRotation, scale: 1 });
  const flatBox = new THREE.Box3().setFromObject(flatModel);
  const flatSize = flatBox.getSize(new THREE.Vector3());
  assert.strictEqual(isClosedNecklace(flatModel), false);
  assert.ok(Math.abs(flatSize.x - 0.16) < 1e-6, `flat necklace 16 cm wide, got ${flatSize.x}`);
  assert.ok(Math.abs(flatBox.max.y) < 1e-9, 'top of the chain at the origin');
  assert.ok(flatSize.z < flatSize.x * 0.5, 'thin front to back');
  // After alignment the pendant (most vertices) must be at the bottom.
  const verticesY: number[] = [];
  flatModel.updateMatrixWorld(true);
  flatModel.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) verticesY.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).y);
  });
  const meanY = verticesY.reduce((a, b) => a + b, 0) / verticesY.length;
  assert.ok(meanY < (flatBox.min.y + flatBox.max.y) / 2, 'pendant hangs at the bottom');
  console.log('✓ flat necklace aligned, sized and anchored at the top');

  // --- Closed loop lying flat (loop axis Z): should stand with the loop axis on Y ---
  const loop = new THREE.Group();
  loop.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 8, 64)));
  const front = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16));
  front.position.set(0, -1.1, 0);
  loop.add(front);
  const loopModel = normalizeNecklaceModel(loop, { rotation: autoAlignNecklaceRotation(loop), scale: 1 });
  const loopSize = new THREE.Box3().setFromObject(loopModel).getSize(new THREE.Vector3());
  assert.strictEqual(isClosedNecklace(loopModel), true);
  assert.ok(loopSize.y < loopSize.x * 0.5 && loopSize.y < loopSize.z * 0.5, `loop axis vertical, got ${loopSize.toArray()}`);
  assert.ok(Math.abs(loopSize.x - 0.134) < 1e-6, `closed loop wraps the neck with slack, got ${loopSize.x}`);
  console.log('✓ closed loop aligned around the neck');

  console.log('\nAll necklace try-on tests passed.');
}

run();
