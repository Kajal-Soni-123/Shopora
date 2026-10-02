import * as THREE from 'three';
import type { HandLandmarker, HandLandmarkerResult, ImageSegmenter } from '@mediapipe/tasks-vision';
import { ArScene, createContactShadows, createWristOccluder, disposeObject, WRIST_RADIUS_X, WRIST_RADIUS_Z } from './wristScene';
import { computeWristPose, WATCH_OFFSET_FROM_WRIST_M, type WristPose } from './wristPose';
import { measureForearm, type ForearmMeasurement, type SkinMask } from './wristMeasure';
import { isRightHandFromLabel } from './handTracker';

/** Phone photos can be 12+ MP; this keeps detection and WebGL fast without visible quality loss. */
const MAX_PHOTO_SIDE = 2048;

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
  private readonly photo = document.createElement('canvas');
  private readonly output = document.createElement('canvas');
  private readonly modelSize: THREE.Vector3;
  private detection: HandLandmarkerResult | null = null;
  private skinMask: SkinMask | null = null;
  private lastPose: WristPose | null = null;
  private lastForearm: ForearmMeasurement | null = null;
  private lastPlacement: Placement | null = null;

  constructor(model: THREE.Group) {
    this.modelSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const caseRadius = THREE.MathUtils.clamp(this.modelSize.x / 2, 0.012, 0.03);
    this.rig.add(createWristOccluder(), createContactShadows({ bandWidth: 0.02, caseRadius }), model);
    this.rig.visible = false;
    this.ar.scene.add(this.rig);
  }

  /**
   * Loads the customer's photo, finds their hand and, when a segmenter is given, their skin.
   * Returns false when no hand is visible.
   */
  setPhoto(image: HTMLImageElement, landmarker: HandLandmarker, segmenter?: ImageSegmenter): boolean {
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    this.photo.width = this.output.width = width;
    this.photo.height = this.output.height = height;
    this.photo.getContext('2d')!.drawImage(image, 0, 0, width, height);

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
  render({ fit, flipSide }: PhotoRenderOptions): HTMLCanvasElement | null {
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
    this.rig.visible = true;
    this.ar.render();

    const ctx = this.output.getContext('2d')!;
    ctx.drawImage(this.photo, 0, 0);
    ctx.drawImage(this.ar.renderer.domElement, 0, 0);
    return this.output;
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
