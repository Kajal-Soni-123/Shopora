import * as THREE from 'three';
import type { FaceLandmarker, FaceLandmarkerResult, ImageSegmenter, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { ArScene, disposeObject } from './wristScene';
import { isDangling } from './earringModel';
import type { SkinMask } from './wristMeasure';
import { photoRenderScale, drawHairLayer, drawWithContactShadow, grownSilhouetteMask, HAIR } from './compositing';


// Face-oval landmarks beside each ear (MediaPipe face mesh): at the tragus, and lower down the jaw.
const IMAGE_LEFT_TRAGUS = 234;
const IMAGE_RIGHT_TRAGUS = 454;
const FOREHEAD = 10;
const CHIN = 152;

/** Distance between landmarks 234 and 454 on an average adult face. Sets the photo's scale. */
const FACE_WIDTH_M = 0.14;
/** Where an earlobe piercing sits relative to landmark 234/454: lower, further back and slightly out. */
const LOBE_DOWN_M = 0.028;
const LOBE_BACK_M = 0.012;
const LOBE_OUT_M = 0.006;
/** An ear turned further away than this (outward direction's depth component) is hidden by the head. */
const HIDDEN_EAR_DEPTH = -0.6;

export interface EarringRenderOptions {
  /** Multiplies the earring size. */
  fit: number;
  /** Turns the earrings about the vertical, in degrees, to show their sides. */
  rotation?: number;
  /** Moves the earrings along the head's up axis, in centimetres, when the lobe estimate is off. */
  offset?: number;
}

interface HeadFrame {
  right: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
  pixelsPerMeter: number;
}

interface EarPlacement {
  /** Pixels, origin bottom-left (y up), like the AR scene. */
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  visible: boolean;
  /** Hair covers this ear, so it is drawn over the earring. */
  underHair: boolean;
}

function headFrame(points: NormalizedLandmark[], width: number, height: number): HeadFrame | null {
  // Image landmarks with relative depth: x, y in pixels (y up), z toward the camera.
  const at = (i: number) => new THREE.Vector3(points[i].x * width, -points[i].y * height, -points[i].z * width);
  const across = at(IMAGE_RIGHT_TRAGUS).sub(at(IMAGE_LEFT_TRAGUS));
  const faceWidthPx = across.length();
  if (faceWidthPx < 1) return null;
  const right = across.normalize();
  const up = at(FOREHEAD).sub(at(CHIN)).normalize();
  const forward = new THREE.Vector3().crossVectors(right, up).normalize();
  up.crossVectors(forward, right).normalize();
  return { right, up, forward, pixelsPerMeter: faceWidthPx / FACE_WIDTH_M };
}

/**
 * Places a pair of earrings on a customer's photo, entirely in the browser.
 * The vendor's model goes on the image-left ear; a mirrored copy goes on the other.
 */
export class EarringPhotoRenderer {
  private readonly ar = new ArScene();
  private readonly ears: Array<{ anchor: THREE.Group; spinner: THREE.Group; side: -1 | 1; landmark: number }>;
  private readonly dangling: boolean;
  private readonly photo = document.createElement('canvas');
  private readonly output = document.createElement('canvas');
  private readonly hairLayer = document.createElement('canvas');
  private detection: FaceLandmarkerResult | null = null;
  private hairMask: SkinMask | null = null;
  private lastPlacements: EarPlacement[] = [];
  private lastScale = 0;

  constructor(model: THREE.Group) {
    this.dangling = isDangling(model);
    this.ears = ([
      [-1, IMAGE_LEFT_TRAGUS, model],
      [1, IMAGE_RIGHT_TRAGUS, model.clone(true)],
    ] as const).map(([side, landmark, earring]) => {
      const spinner = new THREE.Group();
      spinner.add(earring);
      const anchor = new THREE.Group();
      anchor.add(spinner);
      anchor.visible = false;
      this.ar.scene.add(anchor);
      return { anchor, spinner, side, landmark };
    });
  }

  /** Loads the customer's photo and finds their face and hair. Returns false when no face is visible. */
  setPhoto(image: HTMLImageElement, landmarker: FaceLandmarker, segmenter?: ImageSegmenter): boolean {
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
    if (segmenter && this.detection.faceLandmarks.length) {
      try {
        const result = segmenter.segment(this.photo);
        const mask = result.categoryMask;
        if (mask) this.hairMask = { data: mask.getAsUint8Array().slice(), width: mask.width, height: mask.height };
        result.close();
      } catch (err) {
        // Earrings are still placed; they just won't tuck under hair.
        console.warn('[EarringTryOn] Hair segmentation failed', err);
      }
    }
    drawHairLayer(this.photo, this.hairMask, this.hairLayer);
    return this.detection.faceLandmarks.length > 0;
  }

  /** Fraction of hair pixels in a small window around (x, y), in y-down pixels. */
  private hairCoverage(x: number, y: number, radiusPx: number): number {
    const mask = this.hairMask;
    if (!mask) return 0;
    const { width, height } = this.photo;
    let hair = 0;
    let total = 0;
    for (let dy = -radiusPx; dy <= radiusPx; dy += Math.max(1, radiusPx / 3)) {
      for (let dx = -radiusPx; dx <= radiusPx; dx += Math.max(1, radiusPx / 3)) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const mx = Math.floor((px / width) * mask.width);
        const my = Math.floor((py / height) * mask.height);
        total++;
        if (mask.data[my * mask.width + mx] === HAIR) hair++;
      }
    }
    return total ? hair / total : 0;
  }

  /** Composites the earrings onto the photo. Returns null if there is no detected face. */
  render({ fit, rotation = 0, offset = 0 }: EarringRenderOptions): HTMLCanvasElement | null {
    const points = this.detection?.faceLandmarks[0];
    if (!points) return null;
    const { width, height } = this.photo;
    const frame = headFrame(points, width, height);
    if (!frame) return null;
    const { right, up, forward, pixelsPerMeter: ppm } = frame;

    // Dangling earrings hang with gravity (photo "down") and only turn with the head; studs follow the head.
    const hangForward = new THREE.Vector3(forward.x, 0, forward.z);
    if (hangForward.lengthSq() < 1e-6) hangForward.set(0, 0, 1);
    hangForward.normalize();
    const hangUp = new THREE.Vector3(0, 1, 0);
    const hangRight = new THREE.Vector3().crossVectors(hangUp, hangForward);
    const basis = this.dangling
      ? new THREE.Matrix4().makeBasis(hangRight, hangUp, hangForward)
      : new THREE.Matrix4().makeBasis(right, up, forward);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);

    this.lastScale = ppm * fit;
    this.lastPlacements = this.ears.map(({ anchor, spinner, side, landmark }) => {
      const p = points[landmark];
      const tragus = new THREE.Vector3(p.x * width, (1 - p.y) * height, 0);
      const outward = right.clone().multiplyScalar(side);
      const position = tragus
        .addScaledVector(up, (-LOBE_DOWN_M + offset / 100) * ppm)
        .addScaledVector(forward, -LOBE_BACK_M * ppm)
        .addScaledVector(outward, LOBE_OUT_M * ppm);
      position.z = 0;

      const visible = outward.z > HIDDEN_EAR_DEPTH;
      const underHair = this.hairCoverage(position.x, height - position.y, Math.max(2, 0.004 * ppm)) > 0.5;

      anchor.position.copy(position);
      anchor.quaternion.copy(quaternion);
      // The second earring is the mirror image of the first, as real pairs are.
      anchor.scale.set(side * this.lastScale, this.lastScale, this.lastScale);
      spinner.rotation.y = THREE.MathUtils.degToRad(rotation);
      anchor.visible = visible;
      return { position, quaternion, visible, underHair };
    });

    this.ar.render();
    const ctx = this.output.getContext('2d')!;
    ctx.drawImage(this.photo, 0, 0);
    drawWithContactShadow(ctx, this.ar.renderer.domElement, ppm);

    // Where hair falls over the ear, put the hair back on top of that earring.
    this.ears.forEach(({ anchor }, i) => {
      if (!this.lastPlacements[i].visible || !this.lastPlacements[i].underHair) return;
      const box = new THREE.Box3().setFromObject(anchor);
      if (box.isEmpty()) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.min.x, height - box.max.y, box.max.x - box.min.x, box.max.y - box.min.y);
      ctx.clip();
      ctx.drawImage(this.hairLayer, 0, 0);
      ctx.restore();
    });
    return this.output;
  }

  /** White-on-black mask of the last rendered earrings, grown slightly. Call after render(). */
  renderMask(): HTMLCanvasElement | null {
    if (!this.lastPlacements.length) return null;
    const { width, height } = this.photo;
    return grownSilhouetteMask(this.ar.renderer.domElement, width, height, Math.max(3, Math.round(0.002 * this.lastScale)));
  }

  dispose() {
    for (const { anchor } of this.ears) disposeObject(anchor);
    this.ar.dispose();
  }
}
