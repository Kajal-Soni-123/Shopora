import * as THREE from 'three';
import type { ImageSegmenter, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArScene, disposeObject } from './wristScene';
import { isClosedNecklace, NECK_RADIUS_X, NECK_RADIUS_Z } from './necklaceModel';
import type { SkinMask } from './wristMeasure';
import { photoRenderScale, drawHairLayer, drawWithContactShadow, grownSilhouetteMask } from './compositing';


// MediaPipe pose landmarks.
const MOUTH_LEFT = 9;
const MOUTH_RIGHT = 10;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

/** Used when the pose model's metric shoulder width looks implausible. */
const FALLBACK_SHOULDER_WIDTH_M = 0.36;
/** Where the chain meets the sides of the neck: this far above the shoulder line... */
const NECK_TOP_ABOVE_SHOULDERS_M = 0.055;
/** ...but never more than this fraction of the way from the shoulders up to the mouth. */
const MAX_NECK_TOP_FRACTION = 0.55;
/** A closed necklace slopes down toward the front, resting on the collarbones. */
const CLOSED_LOOP_TILT = THREE.MathUtils.degToRad(25);
/** A flat necklace lies on the chest, which leans back a little from the neck down. */
const CHEST_TILT = THREE.MathUtils.degToRad(-12);

export interface NecklaceRenderOptions {
  /** Multiplies the necklace size. */
  fit: number;
  /** Moves the necklace along the neck, in centimetres. */
  offset?: number;
}

/** Invisible neck that writes depth only, so the back of a closed necklace is hidden behind it. */
function createNeckOccluder(): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 48);
  geometry.scale(NECK_RADIUS_X - 0.001, 1, NECK_RADIUS_Z - 0.001);
  geometry.translate(0, 0.07, 0);
  const occluder = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -1;
  return occluder;
}

/**
 * Places a necklace on a customer's photo, entirely in the browser, using the shoulders and mouth
 * from MediaPipe Pose for position, tilt and real-world scale.
 */
export class NecklacePhotoRenderer {
  private readonly ar = new ArScene();
  private readonly anchor = new THREE.Group();
  private readonly tilt = new THREE.Group();
  private readonly closed: boolean;
  private readonly photo = document.createElement('canvas');
  private readonly output = document.createElement('canvas');
  private readonly hairLayer = document.createElement('canvas');
  private detection: PoseLandmarkerResult | null = null;
  private hairMask: SkinMask | null = null;
  private lastScale = 0;

  constructor(model: THREE.Group) {
    this.closed = isClosedNecklace(model);
    this.tilt.add(model);
    if (this.closed) {
      this.tilt.rotation.x = CLOSED_LOOP_TILT;
      this.anchor.add(createNeckOccluder());
    } else {
      this.tilt.rotation.x = CHEST_TILT;
    }
    this.anchor.add(this.tilt);
    this.anchor.visible = false;
    this.ar.scene.add(this.anchor);
  }

  /** Loads the customer's photo and finds their shoulders and hair. Returns false when no person is visible. */
  setPhoto(image: HTMLImageElement, landmarker: PoseLandmarker, segmenter?: ImageSegmenter): boolean {
    // Huge photos are shrunk; small ones are enlarged so the product renders crisp.
    const scale = photoRenderScale(image.naturalWidth, image.naturalHeight);
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    for (const canvas of [this.photo, this.output, this.hairLayer]) {
      canvas.width = width;
      canvas.height = height;
    }
    const photoCtx = this.photo.getContext('2d')!;
    photoCtx.imageSmoothingQuality = 'high';
    photoCtx.drawImage(image, 0, 0, width, height);

    this.ar.renderer.setPixelRatio(1);
    this.ar.renderer.setSize(width, height, false);
    this.ar.setSourceSize(width, height);
    this.ar.matchLighting(this.photo);

    this.detection = landmarker.detect(this.photo);
    this.hairMask = null;
    if (segmenter && this.detection.landmarks.length) {
      try {
        const result = segmenter.segment(this.photo);
        const mask = result.categoryMask;
        if (mask) this.hairMask = { data: mask.getAsUint8Array().slice(), width: mask.width, height: mask.height };
        result.close();
      } catch (err) {
        // The necklace is still placed; it just won't go behind hair.
        console.warn('[NecklaceTryOn] Hair segmentation failed', err);
      }
    }
    drawHairLayer(this.photo, this.hairMask, this.hairLayer);
    return this.detection.landmarks.length > 0;
  }

  /** Composites the necklace onto the photo. Returns null if the shoulders and mouth aren't visible. */
  render({ fit, offset = 0 }: NecklaceRenderOptions): HTMLCanvasElement | null {
    const points = this.detection?.landmarks[0];
    const world = this.detection?.worldLandmarks[0];
    if (!points || !world) return null;
    const { width, height } = this.photo;
    const needed = [MOUTH_LEFT, MOUTH_RIGHT, LEFT_SHOULDER, RIGHT_SHOULDER];
    if (needed.some((i) => (points[i].visibility ?? 1) < 0.3)) return null;

    // Image landmarks with relative depth: x, y in pixels (y up from the bottom), z toward the camera.
    const at = (i: number) => new THREE.Vector3(points[i].x * width, (1 - points[i].y) * height, -points[i].z * width);
    const [a, b] = [at(LEFT_SHOULDER), at(RIGHT_SHOULDER)];
    const [imageLeft, imageRight] = a.x < b.x ? [a, b] : [b, a];
    const across = imageRight.clone().sub(imageLeft);
    const shoulderPx = across.length();
    if (shoulderPx < 1) return null;

    const worldShoulder = new THREE.Vector3(world[LEFT_SHOULDER].x, world[LEFT_SHOULDER].y, world[LEFT_SHOULDER].z).distanceTo(
      new THREE.Vector3(world[RIGHT_SHOULDER].x, world[RIGHT_SHOULDER].y, world[RIGHT_SHOULDER].z)
    );
    const shoulderM = worldShoulder > 0.25 && worldShoulder < 0.55 ? worldShoulder : FALLBACK_SHOULDER_WIDTH_M;
    const ppm = shoulderPx / shoulderM;

    const right = across.normalize();
    const shoulderMid = imageLeft.clone().add(imageRight).multiplyScalar(0.5);
    const mouthMid = at(MOUTH_LEFT).add(at(MOUTH_RIGHT)).multiplyScalar(0.5);
    const toMouth = mouthMid.clone().sub(shoulderMid);
    // "Up" stays in the photo's plane: the pose model's depth for the mouth vs the shoulders is far too
    // large, and following it tips the necklace over so it looks squashed and reflects the dark floor.
    const toMouthInPlane = new THREE.Vector3(toMouth.x, toMouth.y, 0);
    const up = toMouthInPlane.addScaledVector(right, -toMouthInPlane.dot(right)).normalize();
    const forward = new THREE.Vector3().crossVectors(right, up).normalize();

    // Top of the necklace: up from the shoulder line, capped below the chin for short necks / tilted heads.
    const rise = Math.min(NECK_TOP_ABOVE_SHOULDERS_M * ppm, MAX_NECK_TOP_FRACTION * toMouth.dot(up)) + (offset / 100) * ppm;
    const position = shoulderMid.clone().addScaledVector(up, rise);
    position.z = 0;

    this.lastScale = ppm * fit;
    this.anchor.position.copy(position);
    this.anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
    this.anchor.scale.setScalar(this.lastScale);
    this.anchor.visible = true;
    this.ar.render();

    const ctx = this.output.getContext('2d')!;
    ctx.drawImage(this.photo, 0, 0);
    drawWithContactShadow(ctx, this.ar.renderer.domElement, ppm);

    // Hair falling over the chest goes in front of the chain; hair beside the neck stays behind it.
    // So hair is drawn back over the necklace only below the shoulder line (canvas y is down).
    if (this.hairMask) {
      const lineY = (x: number) => {
        const t = (x - imageLeft.x) / (imageRight.x - imageLeft.x || 1);
        return height - (imageLeft.y + t * (imageRight.y - imageLeft.y));
      };
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, lineY(0));
      ctx.lineTo(width, lineY(width));
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      const box = new THREE.Box3().setFromObject(this.tilt);
      if (!box.isEmpty()) {
        ctx.beginPath();
        ctx.rect(box.min.x, height - box.max.y, box.max.x - box.min.x, box.max.y - box.min.y);
        ctx.clip();
        ctx.drawImage(this.hairLayer, 0, 0);
      }
      ctx.restore();
    }
    return this.output;
  }

  /** White-on-black mask of the last rendered necklace, grown slightly. Call after render(). */
  renderMask(): HTMLCanvasElement | null {
    if (!this.lastScale) return null;
    const { width, height } = this.photo;
    return grownSilhouetteMask(this.ar.renderer.domElement, width, height, Math.max(3, Math.round(0.003 * this.lastScale)));
  }

  dispose() {
    disposeObject(this.anchor);
    this.ar.dispose();
  }
}
