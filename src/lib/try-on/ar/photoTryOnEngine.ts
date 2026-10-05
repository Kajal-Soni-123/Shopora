import type { ModelFitting, TryOnPlacement, WristItem } from '../tryOnModel';
import { createFaceLandmarker, createHandLandmarker, createPoseLandmarker, createSkinSegmenter } from './handTracker';

export interface PhotoRenderSettings {
  fit: number;
  /** Degrees: around the forearm for wrist items, about the vertical for earrings. */
  rotation: number;
  /** Earrings and necklaces: centimetres up (+) or down (-) from the estimated position. */
  offset: number;
}

/** One customer-photo try-on, whatever the body part. Browser only. */
export interface PhotoTryOnEngine {
  placement: TryOnPlacement;
  /** Finds the hand or face in the photo. Returns false when there is none. */
  setPhoto(image: HTMLImageElement): boolean;
  render(settings: PhotoRenderSettings): HTMLCanvasElement | null;
  renderMask(): HTMLCanvasElement | null;
  dispose(): void;
}

function optionalSegmenter() {
  return createSkinSegmenter().catch((err) => {
    // Placement still works from landmarks alone; only wrist measuring / hair tucking are lost.
    console.warn('[PhotoTryOn] Segmenter unavailable', err);
    return null;
  });
}

/** Loads the tracker, segmenter and product model for a placement. */
export async function createPhotoTryOnEngine(
  placement: TryOnPlacement,
  modelUrl: string,
  fitting: ModelFitting | 'auto',
  wristItem: WristItem = 'watch'
): Promise<PhotoTryOnEngine> {
  if (placement === 'neck') {
    const [{ loadNecklaceModel }, { NecklacePhotoRenderer }] = await Promise.all([
      import('./necklaceModel'),
      import('./necklaceTryOn'),
    ]);
    const [landmarker, segmenter, model] = await Promise.all([
      createPoseLandmarker(),
      optionalSegmenter(),
      loadNecklaceModel(modelUrl, fitting),
    ]);
    const renderer = new NecklacePhotoRenderer(model);
    return {
      placement,
      setPhoto: (image) => renderer.setPhoto(image, landmarker, segmenter ?? undefined),
      render: ({ fit, offset }) => renderer.render({ fit, offset }),
      renderMask: () => renderer.renderMask(),
      dispose: () => {
        landmarker.close();
        segmenter?.close();
        renderer.dispose();
      },
    };
  }

  if (placement === 'ear') {
    const [{ loadEarringModel }, { EarringPhotoRenderer }] = await Promise.all([
      import('./earringModel'),
      import('./earringTryOn'),
    ]);
    const [landmarker, segmenter, model] = await Promise.all([
      createFaceLandmarker(),
      optionalSegmenter(),
      loadEarringModel(modelUrl, fitting),
    ]);
    const renderer = new EarringPhotoRenderer(model);
    return {
      placement,
      setPhoto: (image) => renderer.setPhoto(image, landmarker, segmenter ?? undefined),
      render: ({ fit, rotation, offset }) => renderer.render({ fit, rotation, offset }),
      renderMask: () => renderer.renderMask(),
      dispose: () => {
        landmarker.close();
        segmenter?.close();
        renderer.dispose();
      },
    };
  }

  const [{ loadWristModel }, { PhotoTryOnRenderer }] = await Promise.all([
    import('./productModel'),
    import('./photoTryOn'),
  ]);
  const [landmarker, segmenter, model] = await Promise.all([
    createHandLandmarker('IMAGE'),
    optionalSegmenter(),
    loadWristModel(modelUrl, fitting, wristItem),
  ]);
  const renderer = new PhotoTryOnRenderer(model, wristItem);
  return {
    placement,
    setPhoto: (image) => renderer.setPhoto(image, landmarker, segmenter ?? undefined),
    render: ({ fit, rotation }) => renderer.render({ fit, rotation, flipSide: false }),
    renderMask: () => renderer.renderMask(),
    dispose: () => {
      landmarker.close();
      segmenter?.close();
      renderer.dispose();
    },
  };
}
