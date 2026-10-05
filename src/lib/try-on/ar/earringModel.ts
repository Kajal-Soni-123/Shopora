import * as THREE from 'three';
import { DEFAULT_FITTING, type ModelFitting } from '../tryOnModel';
import { loadGlbScene, worldVertices } from './productModel';

/**
 * Real-world sizes an earring model is fitted to. File units can't be trusted (AI image-to-3D tools
 * normalise to a 1-unit box, CAD exports use mm or cm), so the model is scaled by its width.
 * Vendors and customers can adjust the size from there.
 */
const EARRING_WIDTH_M = 0.014;
const MAX_EARRING_LENGTH_M = 0.07;

/** Taller than this (relative to its width) and the earring dangles; otherwise it's a stud. */
const DANGLE_ASPECT = 1.4;

/**
 * Wraps an earring model in the ear frame used by the try-on:
 * origin at the top centre (where it hangs from the earlobe), +Y up, +Z the decorative front.
 * A model exported in glTF's default "front faces +Z, up is +Y" orientation needs no rotation.
 */
export function normalizeEarringModel(source: THREE.Object3D, fitting: ModelFitting = DEFAULT_FITTING): THREE.Group {
  const inner = new THREE.Group();
  inner.add(source);
  const [rx, ry, rz] = fitting.rotation;
  inner.rotation.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ');

  const wrapper = new THREE.Group();
  wrapper.add(inner);
  wrapper.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
  let scale = size.x > 0 ? EARRING_WIDTH_M / size.x : 1;
  if (size.y * scale > MAX_EARRING_LENGTH_M) scale = MAX_EARRING_LENGTH_M / size.y;
  inner.scale.setScalar(scale * fitting.scale);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(inner);
  const centre = box.getCenter(new THREE.Vector3());
  inner.position.set(-centre.x, -box.max.y, -centre.z);

  return wrapper;
}

const PAIR_BINS = 64;
/** The gap between a pair must lie in the middle part of the model, not near an edge. */
const PAIR_GAP_ZONE: [number, number] = [0.2, 0.8];

/** Every triangle of every mesh, in world space. */
function worldTriangles(root: THREE.Object3D): THREE.Vector3[][] {
  root.updateMatrixWorld(true);
  const triangles: THREE.Vector3[][] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const position = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
    if (!position) return;
    const index = mesh.geometry.index;
    const count = index ? index.count : position.count;
    const vertex = (i: number) =>
      new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
    for (let i = 0; i + 2 < count; i += 3) triangles.push([vertex(i), vertex(i + 1), vertex(i + 2)]);
  });
  return triangles;
}

/**
 * Finds the split between two earrings modelled side by side (common when a product photo shows the
 * pair). Looks for a band across the middle of one of the two larger axes that no triangle touches,
 * with two halves of similar size and detail on either side. Returns null for a single earring; a
 * hoop's hole doesn't count, because the hoop's surface still crosses that band above and below it.
 */
function findPairSplit(triangles: THREE.Vector3[][]): { axis: 0 | 1 | 2; at: number } | null {
  const box = new THREE.Box3();
  for (const triangle of triangles) for (const v of triangle) box.expandByPoint(v);
  const size = box.getSize(new THREE.Vector3()).toArray();
  const thinnest = [0, 1, 2].sort((a, b) => size[a] - size[b])[0];

  for (const axis of ([0, 1, 2] as const).filter((a) => a !== thinnest)) {
    const min = box.min.getComponent(axis);
    const extent = size[axis];
    if (extent <= 0) continue;
    const bin = (value: number) => Math.min(PAIR_BINS - 1, Math.max(0, Math.floor(((value - min) / extent) * PAIR_BINS)));
    // Coverage: how many triangles span each band. Centres: how much detail sits in each band.
    const coverage = new Array(PAIR_BINS).fill(0);
    const centres = new Array(PAIR_BINS).fill(0);
    for (const triangle of triangles) {
      const values = triangle.map((v) => v.getComponent(axis));
      for (let i = bin(Math.min(...values)); i <= bin(Math.max(...values)); i++) coverage[i]++;
      centres[bin((values[0] + values[1] + values[2]) / 3)]++;
    }

    // The uncovered run closest to the middle.
    const first = Math.floor(PAIR_GAP_ZONE[0] * PAIR_BINS);
    const last = Math.ceil(PAIR_GAP_ZONE[1] * PAIR_BINS);
    let best: [number, number] | null = null;
    for (let i = first; i < last; i++) {
      if (coverage[i] !== 0) continue;
      let j = i;
      while (j + 1 < PAIR_BINS && coverage[j + 1] === 0) j++;
      const distance = Math.abs((i + j) / 2 - PAIR_BINS / 2);
      if (!best || distance < Math.abs((best[0] + best[1]) / 2 - PAIR_BINS / 2)) best = [i, j];
      i = j;
    }
    if (!best) continue;

    const leftExtent = best[0];
    const rightExtent = PAIR_BINS - 1 - best[1];
    const leftCount = centres.slice(0, best[0]).reduce((a, b) => a + b, 0);
    const rightCount = centres.slice(best[1] + 1).reduce((a, b) => a + b, 0);
    const similarSize = leftExtent / rightExtent > 0.6 && leftExtent / rightExtent < 1.67;
    const similarDetail = leftCount / rightCount > 0.5 && leftCount / rightCount < 2;
    if (similarSize && similarDetail) {
      return { axis, at: min + (((best[0] + best[1] + 1) / 2) * extent) / PAIR_BINS };
    }
  }
  return null;
}

/** Copy of a mesh's geometry keeping only the triangles `keep` accepts (centroids in world space). */
function filterTriangles(mesh: THREE.Mesh, keep: (centroid: THREE.Vector3) => boolean): THREE.BufferGeometry {
  const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const position = source.getAttribute('position');
  const triangleCount = position.count / 3;
  const kept: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < triangleCount; t++) {
    a.fromBufferAttribute(position, t * 3).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, t * 3 + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, t * 3 + 2).applyMatrix4(mesh.matrixWorld);
    if (keep(a.clone().add(b).add(c).divideScalar(3))) kept.push(t);
  }

  const result = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const { itemSize, normalized } = attribute;
    const ArrayType = (attribute.array as Float32Array).constructor as new (length: number) => Float32Array;
    const array = new ArrayType(kept.length * 3 * itemSize);
    kept.forEach((t, k) => {
      for (let v = 0; v < 3; v++) {
        for (let i = 0; i < itemSize; i++) {
          array[(k * 3 + v) * itemSize + i] = attribute.getComponent(t * 3 + v, i);
        }
      }
    });
    result.setAttribute(name, new THREE.BufferAttribute(array, itemSize, normalized));
  }

  // Multi-material meshes: rebuild draw groups from the kept triangles' materials.
  if (source.groups.length) {
    const materialOf = (t: number) =>
      source.groups.find((g) => t * 3 >= g.start && t * 3 < g.start + g.count)?.materialIndex ?? 0;
    kept.forEach((t, k) => {
      const material = materialOf(t);
      const last = result.groups[result.groups.length - 1];
      if (last && last.materialIndex === material) last.count += 3;
      else result.addGroup(k * 3, 3, material);
    });
  }
  return result;
}

/**
 * If the model is a pair of earrings, returns a copy containing only one of them; otherwise returns
 * the input unchanged. The try-on puts this one earring on both ears (mirrored), so a pair in the file
 * would otherwise show four earrings. Never modifies the input's geometry, which may be shared.
 */
export function isolateSingleEarring(source: THREE.Object3D): THREE.Object3D {
  const triangles = worldTriangles(source);
  if (triangles.length < 10) return source;
  const split = findPairSplit(triangles);
  if (!split) return source;

  const copy = source.clone(true);
  copy.updateMatrixWorld(true);
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = filterTriangles(mesh, (centroid) => centroid.getComponent(split.axis) < split.at);
  });
  return copy;
}

/** Studs sit rigidly on the earlobe; longer earrings hang from it and follow gravity instead. */
export function isDangling(model: THREE.Object3D): boolean {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  return size.y > DANGLE_ASPECT * size.x;
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

/**
 * Picks the quarter-turn rotation that stands an earring upright facing the camera:
 * its thinnest extent front to back (Z), its longest along Y, the heavier end (the drop) down,
 * and the bulkier side (stones, not the thin post) to the front.
 */
export function autoAlignEarringRotation(source: THREE.Object3D): ModelFitting['rotation'] {
  const vertices = worldVertices(source);
  if (!vertices.length) return [0, 0, 0];
  const box = new THREE.Box3().setFromPoints(vertices);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).toArray();
  const order = [0, 1, 2].sort((a, b) => size[a] - size[b]);

  const lean = (axis: THREE.Vector3) => vertices.reduce((sum, v) => sum + v.clone().sub(centre).dot(axis), 0);
  const thinnest = AXES[order[0]];
  const longest = AXES[order[2]];
  const wantZ = thinnest.clone().multiplyScalar(lean(thinnest) >= 0 ? 1 : -1);
  // Vertices bunch toward the drop, so "up" points away from where they lean.
  const wantY = longest.clone().multiplyScalar(lean(longest) <= 0 ? 1 : -1);

  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  let best: ModelFitting['rotation'] = [0, 0, 0];
  let bestScore = -Infinity;
  for (let rx = 0; rx < 4; rx++) {
    for (let ry = 0; ry < 4; ry++) {
      for (let rz = 0; rz < 4; rz++) {
        quaternion.setFromEuler(euler.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2, 'XYZ'));
        const score = wantZ.clone().applyQuaternion(quaternion).z * 10 + wantY.clone().applyQuaternion(quaternion).y;
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = [rx, ry, rz];
        }
      }
    }
  }
  return best;
}

/** Loads a .glb and returns it wrapped in the ear frame. Pass 'auto' to align it automatically. Browser only. */
export async function loadEarringModel(url: string, fitting: ModelFitting | 'auto'): Promise<THREE.Group> {
  const earring = isolateSingleEarring(await loadGlbScene(url));
  const resolved = fitting === 'auto' ? { ...DEFAULT_FITTING, rotation: autoAlignEarringRotation(earring) } : fitting;
  return normalizeEarringModel(earring, resolved);
}
