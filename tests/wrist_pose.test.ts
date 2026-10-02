import assert from 'assert';
import * as THREE from 'three';
import { computeWristPose, type HandPoint } from '../src/lib/try-on/ar/wristPose';

const SIZE = 1000;
// Image placement: 2000 px per metre, hand centred in the frame.
const PX_PER_M = 2000;

/** Builds a fingers-up hand in the image plane from world points (metres, MediaPipe axes: y down). */
function hand(points: Record<number, [number, number]>) {
  const world: HandPoint[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [index, [x, y]] of Object.entries(points)) world[Number(index)] = { x, y, z: 0 };
  const image = world.map((p) => ({ x: 0.5 + (p.x * PX_PER_M) / SIZE, y: 0.5 + (p.y * PX_PER_M) / SIZE, z: 0 }));
  return { image, world };
}

// Thumb (index side) on image right: a right hand showing its palm, or a left hand showing its back.
const thumbRight = hand({ 0: [0, 0.04], 5: [0.02, -0.04], 9: [0, -0.045], 13: [-0.013, -0.042], 17: [-0.025, -0.035] });
// Mirror image: thumb on image left.
const thumbLeft = hand({ 0: [0, 0.04], 5: [-0.02, -0.04], 9: [0, -0.045], 13: [0.013, -0.042], 17: [0.025, -0.035] });

function dialDirection(pose: NonNullable<ReturnType<typeof computeWristPose>>) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(pose.quaternion);
}

function run() {
  const rightPalm = computeWristPose(thumbRight.image, thumbRight.world, SIZE, SIZE, true)!;
  assert.ok(dialDirection(rightPalm).z < -0.99, 'right hand palm to camera: dial faces away');

  const leftBack = computeWristPose(thumbRight.image, thumbRight.world, SIZE, SIZE, false)!;
  assert.ok(dialDirection(leftBack).z > 0.99, 'left hand back to camera: dial faces camera');

  const rightBack = computeWristPose(thumbLeft.image, thumbLeft.world, SIZE, SIZE, true)!;
  assert.ok(dialDirection(rightBack).z > 0.99, 'right hand back to camera: dial faces camera');

  const strapAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(rightBack.quaternion);
  assert.ok(strapAxis.y > 0.99, 'local +Y points toward the fingers');

  assert.ok(Math.abs(rightBack.pixelsPerMeter - PX_PER_M) < 1, `scale recovered: ${rightBack.pixelsPerMeter}`);

  // Wrist landmark at image y=580 → 420 from the bottom; the watch sits 15 mm (30 px) toward the elbow.
  assert.ok(Math.abs(rightBack.position.x - 500) < 0.5, `x: ${rightBack.position.x}`);
  assert.ok(Math.abs(rightBack.position.y - 390) < 0.5, `y: ${rightBack.position.y}`);

  // A badly tracked pinky joint (world point collapsed toward the wrist) must not inflate the scale.
  const noisyWorld = thumbLeft.world.map((p) => ({ ...p }));
  noisyWorld[17] = { x: 0.005, y: 0.03, z: 0 };
  const noisy = computeWristPose(thumbLeft.image, noisyWorld, SIZE, SIZE, true)!;
  assert.ok(Math.abs(noisy.pixelsPerMeter - PX_PER_M) / PX_PER_M < 0.05, `robust to one bad joint: ${noisy.pixelsPerMeter}`);

  // Joints at different depths: image depth is included, so depth doesn't skew the scale.
  const tiltedWorld = thumbLeft.world.map((p) => ({ ...p, z: -p.y }));
  const tiltedImage = thumbLeft.image.map((p, i) => ({ ...p, z: (tiltedWorld[i].z * PX_PER_M) / SIZE }));
  const tilted = computeWristPose(tiltedImage, tiltedWorld, SIZE, SIZE, true)!;
  assert.ok(Math.abs(tilted.pixelsPerMeter - PX_PER_M) < 1, `tilted hand scale: ${tilted.pixelsPerMeter}`);

  assert.strictEqual(computeWristPose([], [], SIZE, SIZE, true), null, 'missing landmarks return null');

  console.log('wrist_pose: all assertions passed');
}

run();
