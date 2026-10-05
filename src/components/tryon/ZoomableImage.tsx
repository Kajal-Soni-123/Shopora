'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BUTTON_STEP = 1.5;
const DOUBLE_CLICK_SCALE = 2.5;

interface View {
  scale: number;
  x: number;
  y: number;
}

const RESET: View = { scale: 1, x: 0, y: 0 };

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Image with wheel / pinch / button zoom and drag-to-pan. Zoom is kept when `src` changes,
 * so a customer can zoom into their wrist and keep adjusting the try-on.
 */
export function ZoomableImage({ src, alt, className = '' }: ZoomableImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(RESET);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; view: View; mid: { x: number; y: number } } | null>(null);
  const [dragging, setDragging] = useState(false);

  /** Keeps the image covering the frame: no empty space can be panned into view. */
  const clamp = useCallback((next: View): View => {
    const frame = frameRef.current;
    if (!frame) return next;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    const { width, height } = frame.getBoundingClientRect();
    return {
      scale,
      x: Math.min(0, Math.max(width * (1 - scale), next.x)),
      y: Math.min(0, Math.max(height * (1 - scale), next.y)),
    };
  }, []);

  /** Zooms to `scale` keeping the point under (px, py), in frame coordinates, fixed on screen. */
  const zoomAt = useCallback(
    (scale: number, px: number, py: number, from: View = viewRef.current) => {
      const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const ratio = target / from.scale;
      setView(clamp({ scale: target, x: px - (px - from.x) * ratio, y: py - (py - from.y) * ratio }));
    },
    [clamp]
  );

  const localPoint = (clientX: number, clientY: number) => {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const zoomFromCentre = (factor: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(viewRef.current.scale * factor, rect.width / 2, rect.height / 2);
  };

  // React's onWheel is passive, so preventDefault (stop the page scrolling) needs a native listener.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(viewRef.current.scale * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    frameRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        view: viewRef.current,
        mid: localPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const { distance, view: startView, mid } = pinchStart.current;
      zoomAt(startView.scale * (Math.hypot(a.x - b.x, a.y - b.y) / distance), mid.x, mid.y, startView);
      return;
    }
    if (pointers.current.size === 1 && viewRef.current.scale > 1) {
      const current = viewRef.current;
      setView(clamp({ ...current, x: current.x + e.clientX - previous.x, y: current.y + e.clientY - previous.y }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = localPoint(e.clientX, e.clientY);
    zoomAt(viewRef.current.scale > 1 ? 1 : DOUBLE_CLICK_SCALE, x, y);
  };

  const zoomed = view.scale > 1.001;

  return (
    <div className="relative mx-auto w-fit max-w-full">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        className={`relative max-w-full touch-none select-none overflow-hidden ${zoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`block origin-top-left ${className}`}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full bg-black/60 p-0.5 text-white backdrop-blur">
        <button
          type="button"
          onClick={() => zoomFromCentre(1 / BUTTON_STEP)}
          disabled={!zoomed}
          aria-label="Zoom out"
          className="rounded-full p-1.5 transition hover:bg-white/20 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[2.75rem] text-center text-[11px] font-bold tabular-nums">{Math.round(view.scale * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomFromCentre(BUTTON_STEP)}
          disabled={view.scale >= MAX_SCALE}
          aria-label="Zoom in"
          className="rounded-full p-1.5 transition hover:bg-white/20 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {zoomed && (
          <button
            type="button"
            onClick={() => setView(RESET)}
            aria-label="Reset zoom"
            className="rounded-full p-1.5 transition hover:bg-white/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!zoomed && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
          Scroll, pinch or double-click to zoom
        </p>
      )}
    </div>
  );
}
