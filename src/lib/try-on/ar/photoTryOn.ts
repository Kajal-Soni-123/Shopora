import * as THREE from 'three';
import type { HandLandmarker, HandLandmarkerResult, ImageSegmenter } from '@mediapipe/tasks-vision';
import { ArScene, createContactShadows, createWristOccluder, disposeObject, WRIST_RADIUS_X, WRIST_RADIUS_Z } from './wristScene';
import { computeWristPose, WATCH_OFFSET_FROM_WRIST_M, type WristPose } from './wristPose';
import { measureForearm, type ForearmMeasurement, type SkinMask } from './wristMeasure';
import { isRightHandFromLabel } from './handTracker';
import { photoRenderScale } from './compositing';
import type { WristItem } from '../tryOnModel';


/** How far the measured wrist may resize the product versus the landmark estimate, to contain bad masks. */
const MIN_WRIST_FACTOR = 0.7;
const MAX_WRIST_FACTOR = 1.5;

const WRIST = 0;
const MIDDLE_MCP = 9;

export interface PhotoRenderOptions {
  /** Multiplies the measured wrist size; lets the customer fix a strap that floats or sinks in. */
  fit: number;
  /** Puts the product on the other side of the wrist when handedness was misread. */
  flipSide: boolean;
  /** Turns the product around the forearm, in degrees: 0 = dial on the back of the wrist, 180 = palm side. */
  rotation?: number;
}

const WRIST_ELLIPSE = new THREE.Matrix4().makeScale(WRIST_RADIUS_X, 1, WRIST_RADIUS_Z);
const WRIST_ELLIPSE_INVERSE = WRIST_ELLIPSE.clone().invert();

/**
 * Rotation about the forearm (+Y) that follows the wrist's oval cross-section instead of a circle,
 * so a band fitted to the wrist keeps hugging it at every angle. Distortion is greatest at 90°,
 * where the case is seen edge-on and it doesn't show.
 */
function rotationAroundWrist(degrees: number): THREE.Matrix4 {
  const turn = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(degrees));
  return WRIST_ELLIPSE.clone().multiply(turn).multiply(WRIST_ELLIPSE_INVERSE);
}

interface Placement {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: number;
}

/**
 * Corrects the landmark pose with the measured forearm: centres the product on the arm, turns it
 * to follow the forearm (which can bend away from the hand at the wrist), and sizes it so the
 * wrist model's visible width matches the customer's actual wrist.
 */
function placeOnForearm(pose: WristPose, forearm: ForearmMeasurement, photoHeight: number): Placement {
  // Screen space is y-up; the measurement is y-down.
  const towardFingers = new THREE.Vector2(-forearm.towardElbow.x, forearm.towardElbow.y);
  const projectedY = new THREE.Vector3(0, 1, 0).applyQuaternion(pose.quaternion);
  const current = new THREE.Vector2(projectedY.x, projectedY.y);
  let quaternion = pose.quaternion.clone();
  if (current.lengthSq() > 1e-4) {
    const angle = Math.atan2(current.cross(towardFingers), current.dot(towardFingers));
    quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle).multiply(quaternion);
  }

  // The wrist is an ellipse; how wide it looks depends on how far it is rolled toward the camera.
  const across = new THREE.Vector2(-towardFingers.y, towardFingers.x);
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const xAcross = xAxis.x * across.x + xAxis.y * across.y;
  const zAcross = zAxis.x * across.x + zAxis.y * across.y;
  const expectedWidth = 2 * pose.pixelsPerMeter * Math.hypot(WRIST_RADIUS_X * xAcross, WRIST_RADIUS_Z * zAcross);
  const factor = THREE.MathUtils.clamp(forearm.widthPx / expectedWidth, MIN_WRIST_FACTOR, MAX_WRIST_FACTOR);

  return {
    position: new THREE.Vector3(forearm.centre.x, photoHeight - forearm.centre.y, 0),
    quaternion,
    scale: pose.pixelsPerMeter * factor,
  };
}

/**
 * Renders a wrist product model onto a customer's photo, entirely in the browser.
 * The photo is never uploaded; only the composited result is shown to the customer.
 */
export class PhotoTryOnRenderer {
  private readonly ar = new ArScene();
  private readonly rig = new THREE.Group();
  /** Holds the product and its shadows so they can turn around the wrist; the occluder stays put. */
  private readonly spinner = new THREE.Group();
  private readonly photo = document.createElement('canvas');
  private readonly output = document.createElement('canvas');
  private readonly modelSize: THREE.Vector3;
  private readonly shadows: THREE.Group;
  private detection: HandLandmarkerResult | null = null;
  private skinMask: SkinMask | null = null;
  private lastPose: WristPose | null = null;
  private lastForearm: ForearmMeasurement | null = null;
  private lastPlacement: Placement | null = null;

  constructor(model: THREE.Group, item: WristItem = 'watch') {
    this.modelSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    // Along the arm (Y) a watch is as long as its case; across the wrist (X) is the whole band.
    // A bracelet has no case, and its band is as wide (along the arm) as the model itself.
    this.shadows =
      item === 'watch'
        ? createContactShadows({ bandWidth: 0.02, caseRadius: THREE.MathUtils.clamp(this.modelSize.y / 2, 0.01, 0.025) })
        : createContactShadows({ bandWidth: THREE.MathUtils.clamp(this.modelSize.y, 0.004, 0.03), caseRadius: 0 });
    this.spinner.matrixAutoUpdate = false;
    this.spinner.add(this.shadows, model);
    this.rig.add(createWristOccluder(), this.spinner);
    this.rig.visible = false;
    this.ar.scene.add(this.rig);
  }

  /**
   * Loads the customer's photo, finds their hand and, when a segmenter is given, their skin.
   * Returns false when no hand is visible.
   */
  setPhoto(image: HTMLImageElement, landmarker: HandLandmarker, segmenter?: ImageSegmenter): boolean {
    // Huge photos are shrunk; small ones are enlarged so the product renders crisp.
    const scale = photoRenderScale(image.naturalWidth, image.naturalHeight);
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    this.photo.width = this.output.width = width;
    this.photo.height = this.output.height = height;
    const photoCtx = this.photo.getContext('2d')!;
    photoCtx.imageSmoothingQuality = 'high';
    photoCtx.drawImage(image, 0, 0, width, height);

    this.ar.renderer.setPixelRatio(1);
    this.ar.renderer.setSize(width, height, false);
    this.ar.setSourceSize(width, height);
    this.ar.matchLighting(this.photo);

    this.detection = landmarker.detect(this.photo);
    this.skinMask = null;
    if (segmenter && this.detection.landmarks.length) {
      try {
        const result = segmenter.segment(this.photo);
        const mask = result.categoryMask;
        if (mask) this.skinMask = { data: mask.getAsUint8Array().slice(), width: mask.width, height: mask.height };
        result.close();
      } catch (err) {
        // Placement still works from the hand landmarks alone.
        console.warn('[PhotoTryOn] Skin segmentation failed', err);
      }
    }
    return this.detection.landmarks.length > 0;
  }

  /** Composites the product onto the photo. Returns null if there is no detected wrist to place it on. */
  render({ fit, flipSide, rotation = 0 }: PhotoRenderOptions): HTMLCanvasElement | null {
    const image = this.detection?.landmarks[0];
    const world = this.detection?.worldLandmarks[0];
    if (!image || !world) return null;

    const { width, height } = this.photo;
    const isRightHand = isRightHandFromLabel(this.detection!.handedness[0]?.[0]?.categoryName, flipSide);
    const pose = computeWristPose(image, world, width, height, isRightHand);
    if (!pose) return null;

    let forearm: ForearmMeasurement | null = null;
    if (this.skinMask) {
      const wrist = { x: image[WRIST].x * width, y: image[WRIST].y * height };
      const toElbow = new THREE.Vector2(wrist.x - image[MIDDLE_MCP].x * width, wrist.y - image[MIDDLE_MCP].y * height);
      if (toElbow.lengthSq() > 1) {
        toElbow.normalize();
        forearm = measureForearm(this.skinMask, width, height, wrist, toElbow, pose.pixelsPerMeter, WATCH_OFFSET_FROM_WRIST_M);
      }
    }
    const placement: Placement = forearm
      ? placeOnForearm(pose, forearm, height)
      : { position: pose.position, quaternion: pose.quaternion, scale: pose.pixelsPerMeter };

    this.lastPose = pose;
    this.lastForearm = forearm;
    this.lastPlacement = placement;

    this.rig.position.copy(placement.position);
    this.rig.quaternion.copy(placement.quaternion);
    this.rig.scale.setScalar(placement.scale * fit);
    this.spinner.matrix.copy(rotationAroundWrist(rotation));
    this.spinner.matrixWorldNeedsUpdate = true;
    this.rig.visible = true;
    this.ar.render();

    const ctx = this.output.getContext('2d')!;
    ctx.drawImage(this.photo, 0, 0);
    ctx.drawImage(this.ar.renderer.domElement, 0, 0);
    return this.output;
  }

  /**
   * White-on-black mask of where the last render drew the product, grown by
   * a few millimetres so an AI enhancement pass can blend the edges into the skin. Call after render().
   */
  renderMask(): HTMLCanvasElement | null {
    if (!this.lastPlacement) return null;
    const { width, height } = this.photo;

    // Draw the product alone; the soft shadows would otherwise widen the mask into a blob.
    this.shadows.visible = false;
    this.ar.render();
    const silhouette = document.createElement('canvas');
    silhouette.width = width;
    silhouette.height = height;
    const sctx = silhouette.getContext('2d', { willReadFrequently: true })!;
    sctx.drawImage(this.ar.renderer.domElement, 0, 0);
    this.shadows.visible = true;
    this.ar.render();
    const pixels = sctx.getImageData(0, 0, width, height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const covered = pixels.data[i + 3] > 8;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = covered ? 255 : 0;
    }
    sctx.putImageData(pixels, 0, 0);

    // Blur then threshold = dilation by roughly the blur radius.
    const growPx = Math.max(4, Math.round(0.006 * this.lastPlacement.scale));
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const mctx = mask.getContext('2d', { willReadFrequently: true })!;
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, width, height);
    mctx.filter = `blur(${growPx}px)`;
    mctx.drawImage(silhouette, 0, 0);
    mctx.filter = 'none';
    const grown = mctx.getImageData(0, 0, width, height);
    for (let i = 0; i < grown.data.length; i += 4) {
      const value = grown.data[i] > 10 ? 255 : 0;
      grown.data[i] = grown.data[i + 1] = grown.data[i + 2] = value;
      grown.data[i + 3] = 255;
    }
    mctx.putImageData(grown, 0, 0);
    return mask;
  }

  /** Tracking and placement numbers from the last render, for tuning. */
  debugInfo() {
    return {
      photo: { width: this.photo.width, height: this.photo.height },
      handedness: this.detection?.handedness[0]?.[0] ?? null,
      landmarks: this.detection?.landmarks[0] ?? null,
      worldLandmarks: this.detection?.worldLandmarks[0] ?? null,
      skinMask: this.skinMask && { width: this.skinMask.width, height: this.skinMask.height },
      pose: this.lastPose && {
        position: this.lastPose.position.toArray(),
        pixelsPerMeter: this.lastPose.pixelsPerMeter,
      },
      forearm: this.lastForearm,
      placement: this.lastPlacement && {
        position: this.lastPlacement.position.toArray(),
        pixelsPerMeter: this.lastPlacement.scale,
      },
      modelSizeM: this.modelSize.toArray(),
    };
  }

  dispose() {
    disposeObject(this.rig);
    this.ar.dispose();
  }
}
