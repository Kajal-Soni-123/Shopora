import type { HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const SKIN_SEGMENTER_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite';

async function loadVision() {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
  return { vision, fileset };
}

/** Loads MediaPipe's hand landmarker in the browser, preferring the GPU and falling back to CPU. */
export async function createHandLandmarker(runningMode: 'IMAGE' | 'VIDEO'): Promise<HandLandmarker> {
  const { vision, fileset } = await loadVision();
  const create = (delegate: 'GPU' | 'CPU') =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
      runningMode,
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  return create('GPU').catch(() => create('CPU'));
}

/** Loads the person/skin segmenter used to measure the customer's forearm in a photo. */
export async function createSkinSegmenter(): Promise<ImageSegmenter> {
  const { vision, fileset } = await loadVision();
  const create = (delegate: 'GPU' | 'CPU') =>
    vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: SKIN_SEGMENTER_URL, delegate },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  return create('GPU').catch(() => create('CPU'));
}

/** MediaPipe Tasks reports the person's actual hand for unmirrored frames, which is what we pass in. */
export function isRightHandFromLabel(label: string | undefined, flip = false): boolean {
  return (label === 'Right') !== flip;
}
