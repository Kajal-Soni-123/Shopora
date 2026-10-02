import * as THREE from 'three';
import { WRIST_RADIUS_X, WRIST_RADIUS_Z } from './wristScene';
import { DEFAULT_FITTING, type ModelFitting } from '../tryOnModel';

export { DEFAULT_FITTING, parseFitting, supportsWristTryOn, type ModelFitting } from '../tryOnModel';

/**
 * Real-world sizes the model is fitted to. File units can't be trusted: AI image-to-3D tools
 * normalise every model to roughly a 1-unit box, and CAD exports use mm or cm.
 */
/** Outside width of a closed strap or bangle: the average wrist plus the band's thickness. */
const CLOSED_LOOP_WIDTH_M = 2 * (WRIST_RADIUS_X + 0.003);
/** Case diameter of a typical watch, used when the strap lies flat and can't be fitted to the wrist. */
const FLAT_WATCH_CASE_M = 0.042;

/** A band that wraps the wrist is about as deep (front to back) as it is wide. */
export function isClosedLoop(size: THREE.Vector3): boolean {
  return size.z >= 0.5 * size.x;
}

/**
 * Wraps a product model so it sits in the wrist frame used by the AR scene:
 * +Y along the forearm toward the fingers, +Z out of the dial (back of the hand), origin on the wrist axis.
 * A worn watch's strap wraps around Y, so its 12–6 line runs across the wrist (along X).
 * A model exported in glTF's default "front faces +Z, up is +Y" orientation, worn on an upright arm,
 * needs no rotation.
 */
export function normalizeWristModel(source: THREE.Object3D, fitting: ModelFitting = DEFAULT_FITTING): THREE.Group {
  const inner = new THREE.Group();
  inner.add(source);
  const [rx, ry, rz] = fitting.rotation;
  inner.rotation.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ');

  const wrapper = new THREE.Group();
  wrapper.add(inner);
  wrapper.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
  const closed = isClosedLoop(size);
  const measured = closed ? size.x : size.y;
  const target = closed ? CLOSED_LOOP_WIDTH_M : FLAT_WATCH_CASE_M;
  inner.scale.setScalar(measured > 0 ? (target / measured) * fitting.scale : fitting.scale);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(inner);
  const centre = box.getCenter(new THREE.Vector3());
  // A closed strap wraps the wrist, so centre it on the axis; a flat one rests on top of the wrist.
  const zOffset = closed ? -centre.z : WRIST_RADIUS_Z - box.min.z;
  inner.position.set(-centre.x, -centre.y, zOffset);

  return wrapper;
}

function worldVertices(root: THREE.Object3D): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const vertices: THREE.Vector3[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const position = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      vertices.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  return vertices;
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const ANGLE_BINS = 36;

/**
 * Direction from the band's axis toward the watch case: going around a closed band, the case is
 * where the model is widest along the arm and sticks out furthest from the wrist.
 */
function caseDirection(vertices: THREE.Vector3[], centre: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 {
  const e1 = new THREE.Vector3().crossVectors(axis, Math.abs(axis.x) < 0.9 ? AXES[0] : AXES[1]).normalize();
  const e2 = new THREE.Vector3().crossVectors(axis, e1);
  const minH = new Array(ANGLE_BINS).fill(Infinity);
  const maxH = new Array(ANGLE_BINS).fill(-Infinity);
  const maxR = new Array(ANGLE_BINS).fill(0);
  const rel = new THREE.Vector3();
  for (const v of vertices) {
    rel.subVectors(v, centre);
    const h = rel.dot(axis);
    const p1 = rel.dot(e1);
    const p2 = rel.dot(e2);
    const bin = Math.floor(((Math.atan2(p2, p1) + Math.PI) / (2 * Math.PI)) * ANGLE_BINS) % ANGLE_BINS;
    minH[bin] = Math.min(minH[bin], h);
    maxH[bin] = Math.max(maxH[bin], h);
    maxR[bin] = Math.max(maxR[bin], Math.hypot(p1, p2));
  }
  const width = maxH.map((max, i) => (max > minH[i] ? max - minH[i] : 0));
  const widest = Math.max(...width) || 1;
  const furthest = Math.max(...maxR) || 1;
  const binScore = width.map((w, i) => w / widest + maxR[i] / furthest);

  let bestBin = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < ANGLE_BINS; i++) {
    // Smooth over neighbouring bins so one stray vertex can't win.
    const score =
      binScore[(i + ANGLE_BINS - 1) % ANGLE_BINS] + binScore[i] + binScore[(i + 1) % ANGLE_BINS];
    if (score > bestScore) {
      bestScore = score;
      bestBin = i;
    }
  }
  const angle = ((bestBin + 0.5) / ANGLE_BINS) * 2 * Math.PI - Math.PI;
  return e1.clone().multiplyScalar(Math.cos(angle)).addScaledVector(e2, Math.sin(angle));
}

/**
 * Picks the quarter-turn rotation that puts a wrist product in the wrist frame, so vendors rarely
 * need to align models by hand. A closed band must wrap the arm (its thinnest extent along Y) with
 * the case facing out (+Z). A flat watch must lie with its thinnest extent front to back, the strap
 * across the wrist (X), and the case side out; the case is the bulkier side, so vertices lean that way.
 */
export function autoAlignRotation(source: THREE.Object3D): ModelFitting['rotation'] {
  const vertices = worldVertices(source);
  if (!vertices.length) return [0, 0, 0];
  const box = new THREE.Box3().setFromPoints(vertices);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).toArray();
  const order = [0, 1, 2].sort((a, b) => size[a] - size[b]);
  const closed = size[order[1]] >= 0.5 * size[order[2]];

  const thinnest = AXES[order[0]];
  let wantY: THREE.Vector3 | null = null;
  let wantX: THREE.Vector3 | null = null;
  let wantZ: THREE.Vector3;
  if (closed) {
    wantY = thinnest;
    wantZ = caseDirection(vertices, centre, thinnest);
  } else {
    wantX = AXES[order[2]];
    const lean = vertices.reduce((sum, v) => sum + v.clone().sub(centre).dot(thinnest), 0);
    wantZ = thinnest.clone().multiplyScalar(lean >= 0 ? 1 : -1);
  }

  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  let best: ModelFitting['rotation'] = [0, 0, 0];
  let bestScore = -Infinity;
  for (let rx = 0; rx < 4; rx++) {
    for (let ry = 0; ry < 4; ry++) {
      for (let rz = 0; rz < 4; rz++) {
        quaternion.setFromEuler(euler.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ'));
        const z = wantZ.clone().applyQuaternion(quaternion).z;
        const shape = wantY
          ? Math.abs(wantY.clone().applyQuaternion(quaternion).y)
          : Math.abs(wantX!.clone().applyQuaternion(quaternion).x);
        const score = shape * 10 + z;
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = [rx, ry, rz];
        }
      }
    }
  }
  return best;
}

/** Lights baked into a .glb (KHR_lights_punctual) fight the scene's photo-matched lighting. */
export function stripLights(root: THREE.Object3D) {
  const lights: THREE.Object3D[] = [];
  root.traverse((object) => {
    if ((object as THREE.Light).isLight) lights.push(object);
  });
  for (const light of lights) light.removeFromParent();
}

const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

/**
 * Loads a .glb (Draco-compressed or not) and returns it wrapped in the wrist frame. Browser only.
 * Pass 'auto' to align it with `autoAlignRotation` instead of a saved fitting.
 */
export async function loadWristModel(url: string, fitting: ModelFitting | 'auto'): Promise<THREE.Group> {
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
  ]);
  const draco = new DRACOLoader().setDecoderPath(DRACO_DECODER_URL);
  try {
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
    stripLights(gltf.scene);
    const resolved = fitting === 'auto' ? { ...DEFAULT_FITTING, rotation: autoAlignRotation(gltf.scene) } : fitting;
    return normalizeWristModel(gltf.scene, resolved);
  } finally {
    draco.dispose();
  }
}
