'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Camera,
  Download,
  FlipHorizontal,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  SwitchCamera,
  Timer,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import { parseFitting, type TryOnPlacement, type WristItem } from '@/lib/try-on/tryOnModel';
import { createPhotoTryOnEngine, type PhotoTryOnEngine } from '@/lib/try-on/ar/photoTryOnEngine';
import { ZoomableImage } from './ZoomableImage';

export interface ModelTryOnProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  model3dUrl: string;
  model3dFitting?: unknown;
}

interface ModelTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ModelTryOnProduct;
  /** Where the product is worn; decides the tracker, controls and wording. */
  placement?: TryOnPlacement;
  /** Wrist products only: a watch or a bracelet. */
  wristItem?: WristItem;
  onAddToCart?: (productId: string) => void;
}

type Phase = 'select' | 'processing' | 'result';

const COPY = {
  wrist: {
    tips: ['Back of your hand facing the camera', 'Wrist and part of your forearm in the photo', 'Good, even light — no strong shadows'],
    upload: 'Upload a photo of your wrist',
    cameraHint: 'Show the back of your hand and wrist',
    processing: 'Placing it on your wrist…',
    notFound: 'We couldn’t find a hand in this photo. Use a photo where your hand and wrist are clearly visible.',
    noPose: 'We couldn’t work out your wrist position. Try a photo with the back of your hand facing the camera.',
    fitLabel: 'Fit on wrist',
    fitHint: 'Adjust if it looks too loose or too tight.',
    fitRange: [0.6, 1.25],
    rotateLabel: 'Rotate on wrist',
    rotateRange: [0, 360],
  },
  ear: {
    tips: ['Face the camera, or turn slightly to show one ear', 'Ears visible — tuck your hair behind them', 'Good, even light on your face'],
    upload: 'Upload a photo of your face',
    cameraHint: 'Face the camera with your ears visible',
    processing: 'Placing them on your ears…',
    notFound: 'We couldn’t find a face in this photo. Use a clear photo of your face with your ears visible.',
    noPose: 'We couldn’t work out where your ears are. Try a photo facing the camera.',
    fitLabel: 'Earring size',
    fitHint: 'Adjust if they look too big or too small.',
    fitRange: [0.5, 1.6],
    rotateLabel: 'Turn earrings',
    rotateRange: [-90, 90],
  },
  neck: {
    tips: ['Face the camera with your neck and upper chest visible', 'Shoulders in the photo; an open neckline works best', 'Good, even light — no strong shadows'],
    upload: 'Upload a photo showing your neck and shoulders',
    cameraHint: 'Face the camera, neck and shoulders visible',
    processing: 'Placing it on your neck…',
    notFound: 'We couldn’t find a person in this photo. Use a front-facing photo showing your neck and shoulders.',
    noPose: 'We couldn’t see your shoulders and mouth clearly. Try a front-facing photo from the chest up.',
    fitLabel: 'Necklace size',
    fitHint: 'Adjust if it looks too big or too small.',
    fitRange: [0.6, 1.5],
    rotateLabel: null,
    rotateRange: [0, 0],
  },
} as const;

export const ModelTryOnModal: React.FC<ModelTryOnModalProps> = ({
  isOpen,
  onClose,
  product,
  placement = 'wrist',
  wristItem = 'watch',
  onAddToCart,
}) => {
  // The AI photoreal model was trained on watches, so it's only offered for them.
  const photorealSupported = placement === 'wrist' && wristItem === 'watch';
  const copy = COPY[placement];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<Promise<PhotoTryOnEngine> | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fit, setFit] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Optional AI photoreal pass on Shopora's own model server; only offered when it's configured.
  const [enhanceAvailable, setEnhanceAvailable] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [showEnhanced, setShowEnhanced] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  const clearEnhanced = useCallback(() => {
    setEnhancedUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/try-on/enhance')
      .then((res) => res.json())
      .then((data) => !cancelled && setEnhanceAvailable(Boolean(data?.data?.available)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // The page rebuilds `product` on every render; key the engine on stable values so it isn't recreated.
  const modelUrl = product.model3dUrl;
  const fittingKey = JSON.stringify(product.model3dFitting ?? null);

  // Start loading the tracker and the product model as soon as the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    // Products without a saved alignment are aligned automatically.
    const fitting = fittingKey === 'null' ? 'auto' : parseFitting(JSON.parse(fittingKey));
    const enginePromise = createPhotoTryOnEngine(placement, modelUrl, fitting, wristItem);
    enginePromise.catch((err) => console.error('[ModelTryOn] Failed to prepare try-on', err));
    engineRef.current = enginePromise;

    return () => {
      engineRef.current = null;
      enginePromise.then((engine) => engine.dispose()).catch(() => {});
      setPhase('select');
      setError(null);
      setResultUrl(null);
      clearEnhanced();
      setFit(1);
      setRotation(0);
      setOffset(0);
    };
  }, [isOpen, placement, wristItem, modelUrl, fittingKey, clearEnhanced]);

  const renderResult = useCallback(async (options: { fit: number; rotation: number; offset: number }) => {
    const engine = await engineRef.current;
    const canvas = engine?.render(options);
    if (canvas) {
      setResultUrl(canvas.toDataURL('image/jpeg', 0.92));
      // A new placement makes any AI version stale.
      clearEnhanced();
    }
    return Boolean(canvas);
  }, [clearEnhanced]);

  const enhance = async () => {
    const engine = await engineRef.current;
    const mask = engine?.renderMask();
    if (!resultUrl || !mask) return;
    setError(null);
    setEnhancing(true);
    try {
      const [image, maskBlob] = await Promise.all([
        fetch(resultUrl).then((res) => res.blob()),
        new Promise<Blob | null>((resolve) => mask.toBlob(resolve, 'image/png')),
      ]);
      if (!maskBlob) throw new Error('Could not prepare the photo.');
      const form = new FormData();
      form.append('image', image, 'composite.jpg');
      form.append('mask', maskBlob, 'mask.png');
      form.append('productId', product.id);
      const res = await fetch('/api/try-on/enhance', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'The AI model could not process this photo.');
      }
      const url = URL.createObjectURL(await res.blob());
      setEnhancedUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      setShowEnhanced(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The AI model could not process this photo.');
    } finally {
      setEnhancing(false);
    }
  };

  const displayedUrl = showEnhanced && enhancedUrl ? enhancedUrl : resultUrl;

  // Re-render when the customer adjusts the size, rotation or position.
  useEffect(() => {
    if (phase !== 'result') return;
    const frame = requestAnimationFrame(() => {
      renderResult({ fit, rotation, offset });
    });
    return () => cancelAnimationFrame(frame);
  }, [fit, rotation, offset, phase, renderResult]);

  const stopCamera = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setCountdown(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const startCamera = async (facing: 'user' | 'environment') => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser can’t open the camera here. Camera access needs HTTPS (or localhost). You can upload a photo instead.');
      return;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(facing);
      setCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'No camera was found on this device. Please upload a photo instead.'
          : 'Could not open the camera. Please upload a photo instead.'
      );
      stopCamera();
    }
  };

  // The <video> element mounts after cameraOpen flips, so attach the stream once it exists.
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  // Release the camera when the modal closes or unmounts.
  useEffect(() => {
    if (!isOpen) stopCamera();
    return () => stopCamera();
  }, [isOpen, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Capture the real (un-mirrored) frame; only the preview is mirrored for the front camera.
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        stopCamera();
        if (blob) handleFile(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  };

  const captureWithTimer = () => {
    if (countdownTimerRef.current) return;
    let remaining = 3;
    setCountdown(remaining);
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(countdownTimerRef.current!);
      countdownTimerRef.current = null;
      setCountdown(null);
      capturePhoto();
    }, 1000);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a photo (JPG, PNG or WEBP).');
      return;
    }
    setError(null);
    setPhase('processing');
    const url = URL.createObjectURL(file);
    try {
      let engine: PhotoTryOnEngine;
      try {
        engine = await engineRef.current!;
      } catch {
        throw new Error('This product’s try-on could not be loaded. Please try again later.');
      }
      const image = new window.Image();
      image.src = url;
      await image.decode();

      if (!engine.setPhoto(image)) {
        throw new Error(copy.notFound);
      }
      setFit(1);
      setRotation(0);
      setOffset(0);
      if (!(await renderResult({ fit: 1, rotation: 0, offset: 0 }))) {
        throw new Error(copy.noPose);
      }
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try another photo.');
      setPhase('select');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const download = () => {
    if (!displayedUrl) return;
    const link = document.createElement('a');
    link.download = `try-on-${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    link.href = displayedUrl;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-md">
      <div className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <Image src={product.image} alt={product.title} fill sizes="44px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <Sparkles className="h-4 w-4 text-indigo-600" /> Try On Yourself
              </h2>
              <p className="truncate text-xs text-slate-500">{product.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close try-on"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {phase === 'result' && resultUrl ? (
            <div className="grid gap-5 md:grid-cols-[1fr_240px]">
              <div className="relative mx-auto w-fit max-w-full self-start overflow-hidden rounded-2xl border border-slate-200">
                <ZoomableImage src={displayedUrl!} alt={`You wearing ${product.title}`} className="h-auto max-h-[70vh] w-auto max-w-full" />
                {enhancing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/50 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-xs font-bold">Making it photoreal… up to a minute</p>
                  </div>
                )}
                {enhancedUrl && (
                  <div className="absolute left-3 top-3 flex rounded-full bg-black/60 p-0.5 text-[11px] font-bold text-white backdrop-blur">
                    {[
                      { value: true, label: 'AI photoreal' },
                      { value: false, label: '3D render' },
                    ].map(({ value, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setShowEnhanced(value)}
                        className={`rounded-full px-2.5 py-1 transition ${showEnhanced === value ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{copy.fitLabel}</p>
                    <span className="text-xs font-semibold text-slate-600">{Math.round(fit * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={copy.fitRange[0]}
                    max={copy.fitRange[1]}
                    step={0.01}
                    value={fit}
                    onChange={(e) => setFit(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500">{copy.fitHint}</p>
                </div>

                {copy.rotateLabel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{copy.rotateLabel}</p>
                    <span className="text-xs font-semibold text-slate-600">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={copy.rotateRange[0]}
                    max={copy.rotateRange[1]}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  {placement === 'wrist' && (
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 180) % 360)}
                      className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FlipHorizontal className="h-4 w-4" /> Showing on the palm side? Flip
                    </button>
                  )}
                </div>
                )}

                {(placement === 'ear' || placement === 'neck') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Position</p>
                      <span className="text-xs font-semibold text-slate-600">
                        {offset > 0 ? '+' : ''}
                        {offset.toFixed(1)} cm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-1.5}
                      max={1.5}
                      step={0.05}
                      value={offset}
                      onChange={(e) => setOffset(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <p className="text-[11px] text-slate-500">
                      {placement === 'ear'
                        ? 'Move them up or down so they sit on your earlobes.'
                        : 'Move it up or down so it sits right on your neck.'}
                    </p>
                  </div>
                )}

                {photorealSupported && enhanceAvailable && !enhancedUrl && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={enhance}
                      disabled={enhancing}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:from-indigo-100 hover:to-purple-100 disabled:opacity-60"
                    >
                      {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      Make it photoreal (AI)
                    </button>
                    <p className="text-[10px] leading-snug text-slate-500">
                      Sends this photo to Shopora&apos;s AI server to blend the watch into your skin and lighting. It
                      isn&apos;t saved.
                    </p>
                  </div>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(product.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"
                    >
                      <ShoppingCart className="h-4 w-4" /> Add to cart · ${product.price.toLocaleString()}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={download}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" /> Save photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('select');
                      setResultUrl(null);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" /> Try another photo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
              {cameraOpen ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`mx-auto max-h-[60vh] w-full object-contain ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                    />
                    {countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="text-7xl font-black text-white drop-shadow-lg">{countdown}</span>
                      </div>
                    )}
                    <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      {copy.cameraHint}
                    </p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={countdown !== null}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                    >
                      <Camera className="h-4 w-4" /> Capture
                    </button>
                    <button
                      type="button"
                      onClick={captureWithTimer}
                      disabled={countdown !== null}
                      title="Capture in 3 seconds"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Timer className="h-4 w-4" /> 3s
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                      disabled={countdown !== null}
                      title="Switch camera"
                      aria-label="Switch camera"
                      className="flex items-center rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <SwitchCamera className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
              <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && phase !== 'processing') handleFile(file);
                }}
                onClick={() => phase !== 'processing' && fileInputRef.current?.click()}
                className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 bg-slate-50/80 hover:border-indigo-400 hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
                {phase === 'processing' ? (
                  <>
                    <Loader2 className="mb-3 h-9 w-9 animate-spin text-indigo-600" />
                    <p className="text-sm font-bold text-slate-800">{copy.processing}</p>
                    <p className="mt-1 text-xs text-slate-500">This takes a few seconds the first time.</p>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-indigo-600 shadow-sm">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {copy.upload}, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP</p>
                  </>
                )}
              </div>
              {phase !== 'processing' && (
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Camera className="h-4 w-4" /> Take a photo
                </button>
              )}
              </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">For the best result</p>
                  <ul className="space-y-1.5">
                    {copy.tips.map((tip) => (
                      <li key={tip} className="flex gap-2 text-xs text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  {photorealSupported && enhanceAvailable
                    ? 'Your photo stays on your device unless you choose “Make it photoreal”.'
                    : 'Your photo stays on your device. It is never uploaded.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
