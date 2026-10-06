'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

export const MAX_REVIEW_PHOTOS = 4;
const MAX_SIDE = 1280; // px — plenty for a review photo, keeps each upload ~100–300 KB
const JPEG_QUALITY = 0.8;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Downscale and re-encode a photo in the browser so reviews stay small. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.fillStyle = '#ffffff'; // transparent PNGs → white background in JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image'));
    };
    img.src = url;
  });
}

interface ReviewPhotoPickerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}

/** Optional photo attachments for a product review (up to 4). */
export function ReviewPhotoPicker({ photos, onChange, disabled }: ReviewPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_REVIEW_PHOTOS - photos.length;

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const chosen = Array.from(files);
    const images = chosen.filter((f) => f.type.startsWith('image/') && f.size <= MAX_SOURCE_BYTES);
    if (images.length < chosen.length) setError('Some files were skipped — only images up to 15 MB are allowed.');
    if (images.length > remaining) setError(`You can add up to ${MAX_REVIEW_PHOTOS} photos.`);

    setIsProcessing(true);
    try {
      const compressed = await Promise.all(images.slice(0, remaining).map(compressImage));
      onChange([...photos, ...compressed]);
    } catch {
      setError("One of the photos couldn't be read. Please try a different image.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          Add Photos <span className="font-medium text-slate-400">(optional)</span>
        </label>
        <span className="text-[11px] font-semibold text-slate-400">
          {photos.length}/{MAX_REVIEW_PHOTOS}
        </span>
      </div>

      <div
        className="flex flex-wrap gap-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && remaining > 0) addFiles(e.dataTransfer.files);
        }}
      >
        {photos.map((src, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-rose-600"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50 text-slate-400 hover:text-amber-600 flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-50"
            title="Add photos (or drop them here)"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span className="text-[10px] font-bold">{isProcessing ? 'Adding' : 'Add'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
