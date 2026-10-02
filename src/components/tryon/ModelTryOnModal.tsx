'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { HandLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';
import {
  AlertTriangle,
  Download,
  FlipHorizontal,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { createHandLandmarker, createSkinSegmenter } from '@/lib/try-on/ar/handTracker';
import { loadWristModel, parseFitting } from '@/lib/try-on/ar/productModel';
import { PhotoTryOnRenderer } from '@/lib/try-on/ar/photoTryOn';

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
  onAddToCart?: (productId: string) => void;
}

type Phase = 'select' | 'processing' | 'result';

interface Engine {
  landmarker: HandLandmarker;
  /** Optional: measures the customer's actual wrist. Without it placement uses hand landmarks only. */
  segmenter: ImageSegmenter | null;
  renderer: PhotoTryOnRenderer;
}

const PHOTO_TIPS = [
  'Back of your hand facing the camera',
  'Wrist and part of your forearm in the photo',
  'Good, even light — no strong shadows',
];

export const ModelTryOnModal: React.FC<ModelTryOnModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<Promise<Engine> | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fit, setFit] = useState(1);
  const [flipSide, setFlipSide] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // The page rebuilds `product` on every render; key the engine on stable values so it isn't recreated.
  const modelUrl = product.model3dUrl;
  const fittingKey = JSON.stringify(product.model3dFitting ?? null);

  // Start loading the hand tracker and the product model as soon as the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const enginePromise = (async () => {
      const [landmarker, segmenter, model] = await Promise.all([
        createHandLandmarker('IMAGE'),
        createSkinSegmenter().catch((err) => {
          console.warn('[ModelTryOn] Skin segmenter unavailable; using landmarks only', err);
          return null;
        }),
        // Products without a saved alignment are aligned automatically.
        loadWristModel(modelUrl, fittingKey === 'null' ? 'auto' : parseFitting(JSON.parse(fittingKey))),
      ]);
      return { landmarker, segmenter, renderer: new PhotoTryOnRenderer(model) };
    })();
    enginePromise.catch((err) => console.error('[ModelTryOn] Failed to prepare try-on', err));
    engineRef.current = enginePromise;

    return () => {
      engineRef.current = null;
      enginePromise
        .then(({ landmarker, segmenter, renderer }) => {
          landmarker.close();
          segmenter?.close();
          renderer.dispose();
        })
        .catch(() => {});
      setPhase('select');
      setError(null);
      setResultUrl(null);
      setFit(1);
      setFlipSide(false);
    };
  }, [isOpen, modelUrl, fittingKey]);

  const renderResult = useCallback(async (options: { fit: number; flipSide: boolean }) => {
    const engine = await engineRef.current;
    const canvas = engine?.renderer.render(options);
    if (canvas) setResultUrl(canvas.toDataURL('image/jpeg', 0.92));
    return Boolean(canvas);
  }, []);

  // Re-render when the customer adjusts the fit or flips the side.
  useEffect(() => {
    if (phase !== 'result') return;
    const frame = requestAnimationFrame(() => {
      renderResult({ fit, flipSide });
    });
    return () => cancelAnimationFrame(frame);
  }, [fit, flipSide, phase, renderResult]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose a photo (JPG, PNG or WEBP).');
      return;
    }
    setError(null);
    setPhase('processing');
    const url = URL.createObjectURL(file);
    try {
      let engine: Engine;
      try {
        engine = await engineRef.current!;
      } catch {
        throw new Error('This product’s try-on could not be loaded. Please try again later.');
      }
      const image = new window.Image();
      image.src = url;
      await image.decode();

      if (!engine.renderer.setPhoto(image, engine.landmarker, engine.segmenter ?? undefined)) {
        throw new Error('We couldn’t find a hand in this photo. Use a photo where your hand and wrist are clearly visible.');
      }
      setFit(1);
      setFlipSide(false);
      if (!(await renderResult({ fit: 1, flipSide: false }))) {
        throw new Error('We couldn’t work out your wrist position. Try a photo with the back of your hand facing the camera.');
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
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.download = `try-on-${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    link.href = resultUrl;
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
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt={`You wearing ${product.title}`} className="mx-auto max-h-[60vh] w-auto" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fit on wrist</p>
                    <span className="text-xs font-semibold text-slate-600">{Math.round(fit * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.25}
                    step={0.01}
                    value={fit}
                    onChange={(e) => setFit(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500">Adjust if it looks too loose or too tight.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setFlipSide((v) => !v)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    flipSide ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FlipHorizontal className="h-4 w-4" /> Showing on the palm side? Flip
                </button>

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
                    <p className="text-sm font-bold text-slate-800">Placing it on your wrist…</p>
                    <p className="mt-1 text-xs text-slate-500">This takes a few seconds the first time.</p>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-indigo-600 shadow-sm">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Upload a photo of your wrist, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP</p>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">For the best result</p>
                  <ul className="space-y-1.5">
                    {PHOTO_TIPS.map((tip) => (
                      <li key={tip} className="flex gap-2 text-xs text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] font-medium text-emerald-800">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Your photo stays on your device. It is never uploaded.
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
