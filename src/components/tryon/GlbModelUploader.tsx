'use client';

import React, { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, CheckCircle2, Link as LinkIcon, Loader2, RotateCcw, RotateCw, UploadCloud, Wand2, X } from 'lucide-react';
import type { Object3D } from 'three';
import {
  DEFAULT_FITTING,
  isGlbHeader,
  isValidTryOnModelUrl,
  MAX_TRY_ON_MODEL_BYTES,
  TRY_ON_MODEL_ROUTE,
  type ModelFitting,
} from '@/lib/try-on/tryOnModel';
import type { ModelDimensions } from './GlbPreview';

const GlbPreview = dynamic(() => import('./GlbPreview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-xs font-semibold text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D preview…
    </div>
  ),
});

interface GlbModelUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  fitting: ModelFitting;
  onFittingChange: (fitting: ModelFitting) => void;
  required?: boolean;
  error?: string;
}

const MAX_MB = MAX_TRY_ON_MODEL_BYTES / (1024 * 1024);

const AXES = [
  { index: 0, label: 'Tilt' },
  { index: 1, label: 'Turn' },
  { index: 2, label: 'Spin' },
] as const;

export const GlbModelUploader: React.FC<GlbModelUploaderProps> = ({
  label,
  value,
  onChange,
  fitting,
  onFittingChange,
  required,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);

  const handleDimensions = useCallback((size: ModelDimensions) => setDimensions(size), []);

  // Models are aligned automatically when first attached; vendors can re-run it or adjust by hand.
  const sceneRef = useRef<Object3D | null>(null);
  const autoAlignPendingRef = useRef(false);
  const autoAlign = useCallback(async () => {
    if (!sceneRef.current) return;
    const { autoAlignRotation } = await import('@/lib/try-on/ar/productModel');
    onFittingChange({ ...DEFAULT_FITTING, rotation: autoAlignRotation(sceneRef.current) });
  }, [onFittingChange]);
  const handleSceneLoaded = useCallback(
    (scene: Object3D) => {
      sceneRef.current = scene;
      if (autoAlignPendingRef.current) {
        autoAlignPendingRef.current = false;
        autoAlign();
      }
    },
    [autoAlign]
  );

  const uploadFile = async (file: File) => {
    setLocalError(null);
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setLocalError('Please choose a .glb file (binary glTF 2.0).');
      return;
    }
    if (file.size > MAX_TRY_ON_MODEL_BYTES) {
      setLocalError(`The 3D model must be ${MAX_MB} MB or smaller. Reduce textures or polygon count and re-export.`);
      return;
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!isGlbHeader(header, file.size)) {
      setLocalError('This file is not a valid glTF 2.0 binary (.glb) model.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(TRY_ON_MODEL_ROUTE, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLocalError(data.error || 'Failed to upload the 3D model.');
        return;
      }
      setFileName(file.name);
      setDimensions(null);
      onFittingChange(DEFAULT_FITTING);
      autoAlignPendingRef.current = true;
      onChange(data.data.url);
    } catch (err) {
      console.error('GLB upload failed:', err);
      setLocalError('Failed to upload the 3D model. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    if (!isValidTryOnModelUrl(url)) {
      setLocalError('Enter an https:// link that ends in .glb.');
      return;
    }
    setLocalError(null);
    setFileName(null);
    setDimensions(null);
    onFittingChange(DEFAULT_FITTING);
    autoAlignPendingRef.current = true;
    onChange(url);
    setUrlDraft('');
  };

  const remove = () => {
    setFileName(null);
    setDimensions(null);
    setLocalError(null);
    onFittingChange(DEFAULT_FITTING);
    onChange('');
  };

  const rotate = (axis: 0 | 1 | 2) => {
    const rotation = [...fitting.rotation] as ModelFitting['rotation'];
    rotation[axis] = (rotation[axis] + 1) % 4;
    onFittingChange({ ...fitting, rotation });
  };

  const shownError = localError || error;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          {label} {required && <span className="font-extrabold text-rose-500">*</span>}
        </label>
        {!value && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
            {(['upload', 'url'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`rounded-md px-2 py-0.5 transition-all ${
                  mode === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'upload' ? 'Upload .glb' : 'Paste URL'}
              </button>
            ))}
          </div>
        )}
      </div>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="h-56 bg-gradient-to-b from-slate-50 to-slate-100">
            <GlbPreview
              url={value}
              fitting={fitting}
              onDimensions={handleDimensions}
              onSceneLoaded={handleSceneLoaded}
              onError={(message) => setLocalError(message)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-3">
            <div className="min-w-0">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 3D model attached
              </span>
              <p className="truncate text-[11px] text-slate-500">
                {fileName || (value.startsWith(TRY_ON_MODEL_ROUTE) ? 'Uploaded to Shopora' : value)}
                {dimensions && ' · Sized automatically to fit the wrist'}
              </p>
            </div>
            <button
              type="button"
              onClick={remove}
              className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
              title="Remove 3D model"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold text-slate-700">
              Check the fit: the strap should wrap around the wrist guide with the dial facing you, as if worn on an
              upright arm.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={autoAlign}
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Wand2 className="h-3 w-3" /> Auto-align
              </button>
              {AXES.map(({ index, label: axisLabel }) => (
                <button
                  key={axisLabel}
                  type="button"
                  onClick={() => rotate(index)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  <RotateCw className="h-3 w-3" /> {axisLabel} 90°
                </button>
              ))}
              {fitting.rotation.some(Boolean) && (
                <button
                  type="button"
                  onClick={() => onFittingChange({ ...fitting, rotation: [0, 0, 0] })}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>
        </div>
      ) : mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ${
            shownError
              ? 'border-rose-300 bg-rose-50/40'
              : isDragging
                ? 'scale-[1.01] border-indigo-600 bg-indigo-50/60'
                : 'border-slate-200 bg-slate-50/80 hover:border-indigo-400 hover:bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,model/gltf-binary"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = '';
            }}
          />
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-indigo-600 shadow-sm">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          </div>
          <p className="text-xs font-bold text-slate-800">
            {uploading ? (
              'Uploading 3D model…'
            ) : (
              <>
                Drag & drop the product&apos;s .glb file, or <span className="text-indigo-600 underline">browse</span>
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">glTF 2.0 binary, up to {MAX_MB} MB, real-world size in metres</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyUrl();
                }
              }}
              placeholder="https://cdn.example.com/products/watch.glb"
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
            />
          </div>
          <button
            type="button"
            onClick={applyUrl}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <Box className="h-3.5 w-3.5" /> Use model
          </button>
        </div>
      )}

      {shownError && <p className="text-[11px] font-semibold text-rose-600">{shownError}</p>}
    </div>
  );
};
