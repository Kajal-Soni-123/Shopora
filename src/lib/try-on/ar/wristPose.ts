import * as THREE from 'three';

/** Minimal landmark shape shared by MediaPipe's normalized and world landmarks. */
export interface HandPoint {
  x: number;
  y: number;
  z: number;
}

export interface WristPose {
  /** Wrist axis centre in source-image pixels (origin bottom-left, y up). */
  position: THREE.Vector3;
  /** Local frame: +Y toward the fingers, +Z out of the back of the hand, +X across the wrist. */
  quaternion: THREE.Quaternion;
  /** Converts the rig's metre units into source-image pixels. */
  pixelsPerMeter: number;
}

const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

/** A watch sits just above the wrist bone, a little up the forearm from MediaPipe's wrist landmark. */
export const WATCH_OFFSET_FROM_WRIST_M = 0.015;

/** Rigid palm bones used to estimate image scale; the median resists one badly tracked joint. */
const SCALE_BONES: Array<[number, number]> = [
  [WRIST, INDEX_MCP],
  [WRIST, MIDDLE_MCP],
  [WRIST, RING_MCP],
  [WRIST, PINKY_MCP],
  [INDEX_MCP, MIDDLE_MCP],
  [MIDDLE_MCP, RING_MCP],
  [RING_MCP, PINKY_MCP],
  [INDEX_MCP, PINKY_MCP],
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// MediaPipe world landmarks are x-right, y-down, z-away; three.js is y-up, z-toward-camera.
function toThree(p: HandPoint): THREE.Vector3 {
  return new THREE.Vector3(p.x, -p.y, -p.z);
}

/**
 * Turns one hand's landmarks into a pose for the watch rig.
 * `isRightHand` must be the person's actual hand, since left and right hands are mirror images
 * and the back-of-hand direction cannot be recovered from geometry alone.
 */
export function computeWristPose(
  image: HandPoint[],
  world: HandPoint[],
  width: number,
  height: number,
  isRightHand: boolean
): WristPose | null {
  if (image.length < 21 || world.length < 21) return null;

  // Orientation comes from the image landmarks (x, y in pixels plus relative depth): they match what
  // is visible. World landmarks can badly overstate depth, e.g. reporting a hand that hangs down
  // across the photo as pointing straight away from the camera.
  const inView = (p: HandPoint) => new THREE.Vector3(p.x * width, -p.y * height, -p.z * width);
  const wrist = inView(image[WRIST]);
  const yAxis = inView(image[MIDDLE_MCP]).sub(wrist).normalize();
  const across = inView(image[INDEX_MCP]).sub(inView(image[PINKY_MCP]));

  // across × fingers points out of the palm for a right hand and out of the back for a left hand.
  const zAxis = new THREE.Vector3().crossVectors(across, yAxis).normalize();
  if (isRightHand) zAxis.negate();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  if (!Number.isFinite(xAxis.x) || xAxis.lengthSq() < 1e-6) return null;

  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  );

  const toPixels = (p: HandPoint) => new THREE.Vector2(p.x * width, (1 - p.y) * height);
  // Image z is relative depth on roughly the same scale as x, so including it undoes foreshortening.
  const toPixels3d = (p: HandPoint) => new THREE.Vector3(p.x * width, p.y * height, p.z * width);
  const ratios: number[] = [];
  for (const [a, b] of SCALE_BONES) {
    const worldLen = toThree(world[a]).distanceTo(toThree(world[b]));
    if (worldLen < 1e-4) continue;
    ratios.push(toPixels3d(image[a]).distanceTo(toPixels3d(image[b])) / worldLen);
  }
  if (!ratios.length) return null;
  const pixelsPerMeter = median(ratios);
  if (!(pixelsPerMeter > 0)) return null;

  const wristPx = toPixels(image[WRIST]);
  const offsetPx = WATCH_OFFSET_FROM_WRIST_M * pixelsPerMeter;
  const position = new THREE.Vector3(wristPx.x - yAxis.x * offsetPx, wristPx.y - yAxis.y * offsetPx, 0);

  return { position, quaternion, pixelsPerMeter };
}

/** Exponential smoothing that eases off when the hand moves fast, so it is steady but not laggy. */
export class PoseSmoother {
  private current: WristPose | null = null;

  update(next: WristPose): WristPose {
    if (!this.current) {
      this.current = {
        position: next.position.clone(),
        quaternion: next.quaternion.clone(),
        pixelsPerMeter: next.pixelsPerMeter,
      };
      return this.current;
    }
    const jumpPx = this.current.position.distanceTo(next.position);
    const alpha = Math.min(1, 0.3 + jumpPx / 60);
    this.current.position.lerp(next.position, alpha);
    this.current.quaternion.slerp(next.quaternion, Math.min(1, alpha + 0.1));
    this.current.pixelsPerMeter += (next.pixelsPerMeter - this.current.pixelsPerMeter) * 0.25;
    return this.current;
  }

  reset() {
    this.current = null;
  }
}
