'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/** Thumbnails of a review's customer photos; click to view full size. */
export function ReviewPhotos({ images, size = 'sm' }: { images?: string[] | null; size?: 'sm' | 'md' }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null || !images) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null);
      if (e.key === 'ArrowRight') setOpenIndex((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, images]);

  if (!images || images.length === 0) return null;
  const thumb = size === 'md' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex(i);
            }}
            className={`${thumb} rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:ring-2 hover:ring-amber-400 transition-all`}
            title="View photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Customer photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {openIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10001] bg-slate-950/85 flex items-center justify-center p-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setOpenIndex(null)}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((openIndex - 1 + images.length) % images.length);
                  }}
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((openIndex + 1) % images.length);
                  }}
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openIndex]}
              alt={`Customer photo ${openIndex + 1}`}
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="absolute bottom-4 text-xs font-bold text-white/70">
              {openIndex + 1} / {images.length}
            </span>
          </div>,
          document.body
        )}
    </>
  );
}
