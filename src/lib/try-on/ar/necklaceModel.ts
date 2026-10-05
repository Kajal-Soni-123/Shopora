import * as THREE from 'three';
import { DEFAULT_FITTING, type ModelFitting } from '../tryOnModel';
import { caseDirection, loadGlbScene, worldVertices } from './productModel';

/** Average adult neck, in metres: wider across than front to back. */
export const NECK_RADIUS_X = 0.055;
export const NECK_RADIUS_Z = 0.05;

/**
 * Real-world sizes a necklace model is fitted to (file units can't be trusted).
 * A flat, front-view necklace is as wide as the neck plus a drape on each side; a closed loop
 * goes around the neck with a little slack.
 */
const FLAT_NECKLACE_WIDTH_M = 0.16;
const CLOSED_LOOP_WIDTH_M = 2 * (NECK_RADIUS_X + 0.012);

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const ANGLE_BINS = 36;
/** A loop has geometry in (nearly) every direction around its centre; a front view is open at the top. */
const CLOSED_LOOP_COVERAGE = 0.9;

/**
 * Fraction of directions around the centre, in the plane of axes u and v, with geometry out near the
 * rim. Points close to the centre (a pendant seen from above) are ignored: a loop's geometry lies on
 * its rim in every direction, while a front-view necklace only reaches the rim at the sides and bottom.
 */
function angularCoverage(vertices: THREE.Vector3[], centre: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3): number {
  const rel = new THREE.Vector3();
  const planar = vertices.map((vertex) => {
    rel.subVectors(vertex, centre);
    return [rel.dot(u), rel.dot(v)] as const;
  });
  const reach = Math.max(...planar.map(([x, y]) => Math.hypot(x, y)));
  if (!(reach > 0)) return 0;
  const filled = new Array(ANGLE_BINS).fill(false);
  for (const [x, y] of planar) {
    if (Math.hypot(x, y) < 0.5 * reach) continue;
    filled[Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * ANGLE_BINS) % ANGLE_BINS] = true;
  }
  return filled.filter(Boolean).length / ANGLE_BINS;
}

/** Whether a normalised necklace wraps the neck (set by normalizeNecklaceModel). */
export function isClosedNecklace(model: THREE.Object3D): boolean {
  return Boolean(model.userData.closedNecklace);
}

/**
 * Wraps a necklace model in the neck frame used by the try-on: +Y up the neck, +Z out of the chest.
 * - Front view (flat): origin at the top centre, where the chain meets the sides of the neck.
 * - Closed loop: origin on the neck axis at the top of the loop, so it wraps the neck.
 * A model exported in glTF's default "front faces +Z, up is +Y" orientation needs no rotation.
 */
export function normalizeNecklaceModel(source: THREE.Object3D, fitting: ModelFitting = DEFAULT_FITTING): THREE.Group {
  const inner = new THREE.Group();
  inner.add(source);
  const [rx, ry, rz] = fitting.rotation;
  inner.rotation.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ');

  const wrapper = new THREE.Group();
  wrapper.add(inner);
  wrapper.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
  // Wraps the neck when it goes all the way round in the horizontal (X–Z) plane.
  const vertices = worldVertices(inner);
  const loopCentre = new THREE.Box3().setFromPoints(vertices).getCenter(new THREE.Vector3());
  const closed = vertices.length > 0 && angularCoverage(vertices, loopCentre, AXES[0], AXES[2]) >= CLOSED_LOOP_COVERAGE;
  const target = closed ? CLOSED_LOOP_WIDTH_M : FLAT_NECKLACE_WIDTH_M;
  inner.scale.setScalar(size.x > 0 ? (target / size.x) * fitting.scale : fitting.scale);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(inner);
  const centre = box.getCenter(new THREE.Vector3());
  inner.position.set(-centre.x, -box.max.y, -centre.z);
  wrapper.userData.closedNecklace = closed;
  return wrapper;
}

/**
 * Picks the quarter-turn rotation that puts a necklace in the neck frame.
 * Closed loop: the loop's thin extent along the neck (Y), the pendant to the front (+Z).
 * Front view: thinnest extent front to back (Z), the pendant (where vertices bunch) at the bottom.
 */
export function autoAlignNecklaceRotation(source: THREE.Object3D): ModelFitting['rotation'] {
  const vertices = worldVertices(source);
  if (!vertices.length) return [0, 0, 0];
  const box = new THREE.Box3().setFromPoints(vertices);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).toArray();
  const order = [0, 1, 2].sort((a, b) => size[a] - size[b]);
  const lean = (axis: THREE.Vector3) => vertices.reduce((sum, v) => sum + v.clone().sub(centre).dot(axis), 0);
  const thinnest = AXES[order[0]];
  // Both a loop and a front view are thin in one direction; only the loop goes all the way round.
  const closed = angularCoverage(vertices, centre, AXES[order[1]], AXES[order[2]]) >= CLOSED_LOOP_COVERAGE;

  let wantY: THREE.Vector3;
  let wantZ: THREE.Vector3;
  if (closed) {
    wantY = thinnest;
    wantZ = caseDirection(vertices, centre, thinnest);
  } else {
    wantZ = thinnest.clone().multiplyScalar(lean(thinnest) >= 0 ? 1 : -1);
    const [a, b] = [AXES[order[1]], AXES[order[2]]];
    const vertical = Math.abs(lean(a)) > Math.abs(lean(b)) ? a : b;
    wantY = vertical.clone().multiplyScalar(lean(vertical) <= 0 ? 1 : -1);
  }

  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  let best: ModelFitting['rotation'] = [0, 0, 0];
  let bestScore = -Infinity;
  for (let rx = 0; rx < 4; rx++) {
    for (let ry = 0; ry < 4; ry++) {
      for (let rz = 0; rz < 4; rz++) {
        quaternion.setFromEuler(euler.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ'));
        const y = wantY.clone().applyQuaternion(quaternion).y;
        const z = wantZ.clone().applyQuaternion(quaternion).z;
        // For a loop, Y only has to be the loop axis (either sign); a front view must hang the right way up.
        const score = closed ? Math.abs(y) * 10 + z : z * 10 + y;
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = [rx, ry, rz];
        }
      }
    }
  }
  return best;
}

/** Loads a .glb and returns it wrapped in the neck frame. Pass 'auto' to align it automatically. Browser only. */
export async function loadNecklaceModel(url: string, fitting: ModelFitting | 'auto'): Promise<THREE.Group> {
  const scene = await loadGlbScene(url);
  const resolved = fitting === 'auto' ? { ...DEFAULT_FITTING, rotation: autoAlignNecklaceRotation(scene) } : fitting;
  return normalizeNecklaceModel(scene, resolved);
}
