'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { Bug, Camera, Download, FlipHorizontal, Hand, Loader2, Upload } from 'lucide-react';
import { WatchRig, type CaseFinish, type DialColor, type StrapStyle, type WatchStyle } from '@/lib/try-on/ar/watchModel';
import { computeWristPose, PoseSmoother } from '@/lib/try-on/ar/wristPose';
import { ArScene } from '@/lib/try-on/ar/wristScene';
import { createHandLandmarker, isRightHandFromLabel } from '@/lib/try-on/ar/handTracker';

/** Frames without a hand before the watch is hidden, so a single missed detection doesn't flicker. */
const MISSED_FRAMES_BEFORE_HIDE = 6;

type Mode = 'idle' | 'camera' | 'photo';

interface Engine {
  ar: ArScene;
  rig: WatchRig;
  smoother: PoseSmoother;
}

const CASE_OPTIONS: Array<{ value: CaseFinish; label: string; swatch: string }> = [
  { value: 'rose-gold', label: 'Rose gold', swatch: '#e3a98c' },
  { value: 'steel', label: 'Steel', swatch: '#d4d8dd' },
  { value: 'black', label: 'Black', swatch: '#2b2b30' },
];
const STRAP_OPTIONS: Array<{ value: StrapStyle; label: string; swatch: string }> = [
  { value: 'brown-leather', label: 'Brown leather', swatch: '#6b3f24' },
  { value: 'black-leather', label: 'Black leather', swatch: '#1d1c1f' },
  { value: 'metal', label: 'Metal bracelet', swatch: 'linear-gradient(135deg,#f1f1f1,#9a9a9a)' },
];
const DIAL_OPTIONS: Array<{ value: DialColor; label: string; swatch: string }> = [
  { value: 'navy', label: 'Navy', swatch: '#1b2f5c' },
  { value: 'white', label: 'White', swatch: '#f4f2ec' },
  { value: 'green', label: 'Green', swatch: '#185240' },
];

function Swatches<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string; swatch: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              value === option.value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: option.swatch }} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WristTryOn() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const engineRef = useRef<Engine | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const runningModeRef = useRef<'VIDEO' | 'IMAGE'>('VIDEO');
  const streamRef = useRef<MediaStream | null>(null);
  const photoResultRef = useRef<HandLandmarkerResult | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const missedFramesRef = useRef(0);
  const handFoundRef = useRef(false);

  const [mode, setMode] = useState<Mode>('idle');
  const [trackerReady, setTrackerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [handFound, setHandFound] = useState(false);
  const [sourceSize, setSourceSize] = useState({ width: 1280, height: 720 });
  const [style, setStyle] = useState<WatchStyle>({ caseFinish: 'rose-gold', strap: 'brown-leather', dial: 'navy' });
  const [fit, setFit] = useState(1);
  const [debug, setDebug] = useState(false);
  const [flipSide, setFlipSide] = useState(false);

  // The render loop reads these every frame without re-subscribing.
  const liveRef = useRef({ mode, fit, debug, flipSide, sourceSize });
  liveRef.current = { mode, fit, debug, flipSide, sourceSize };

  const mirrored = mode === 'camera';

  const markHandFound = (found: boolean) => {
    if (handFoundRef.current === found) return;
    handFoundRef.current = found;
    setHandFound(found);
  };

  // Three.js scene + MediaPipe hand tracker, created once.
  useEffect(() => {
    const ar = new ArScene(glCanvasRef.current!);
    ar.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const rig = new WatchRig(style);
    rig.root.visible = false;
    ar.scene.add(rig.root);

    engineRef.current = { ar, rig, smoother: new PoseSmoother() };

    let cancelled = false;
    (async () => {
      try {
        const landmarker = await createHandLandmarker('VIDEO');
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        runningModeRef.current = 'VIDEO';
        setTrackerReady(true);
      } catch (err) {
        console.error('[WristTryOn] Failed to load hand tracker', err);
        if (!cancelled) setError('Could not load the hand tracking model. Check your internet connection and reload.');
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      rig.dispose();
      ar.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.rig.setStyle(style);
  }, [style]);

  useEffect(() => {
    engineRef.current?.rig.setDebug(debug);
    if (!debug) {
      const ctx = debugCanvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }, [debug]);

  useEffect(() => {
    engineRef.current?.rig.setMirrored(mirrored);
  }, [mirrored]);

  // Keep the renderer and the pixel-space camera matched to the displayed source.
  useEffect(() => {
    const engine = engineRef.current;
    const container = containerRef.current;
    if (!engine || !container) return;
    const { width, height } = sourceSize;
    engine.ar.setSourceSize(width, height);
    if (debugCanvasRef.current) {
      debugCanvasRef.current.width = width;
      debugCanvasRef.current.height = height;
    }
    const resize = () => engine.ar.renderer.setSize(container.clientWidth, container.clientHeight, false);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [sourceSize]);

  const applyResult = useCallback((result: HandLandmarkerResult | null, smooth: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    const { fit, flipSide, debug, sourceSize } = liveRef.current;
    const image = result?.landmarks[0];
    const world = result?.worldLandmarks[0];

    const debugCtx = debug ? debugCanvasRef.current?.getContext('2d') : null;
    debugCtx?.clearRect(0, 0, sourceSize.width, sourceSize.height);

    if (!image || !world) {
      missedFramesRef.current += 1;
      if (!smooth || missedFramesRef.current > MISSED_FRAMES_BEFORE_HIDE) {
        engine.rig.root.visible = false;
        engine.smoother.reset();
        markHandFound(false);
      }
      return;
    }
    missedFramesRef.current = 0;

    const isRightHand = isRightHandFromLabel(result.handedness[0]?.[0]?.categoryName, flipSide);
    const pose = computeWristPose(image, world, sourceSize.width, sourceSize.height, isRightHand);
    if (!pose) return;

    if (!smooth) engine.smoother.reset();
    const smoothed = engine.smoother.update(pose);
    engine.rig.root.position.copy(smoothed.position);
    engine.rig.root.quaternion.copy(smoothed.quaternion);
    engine.rig.root.scale.setScalar(smoothed.pixelsPerMeter * fit);
    engine.rig.root.visible = true;
    markHandFound(true);

    if (debugCtx) {
      debugCtx.fillStyle = '#22d3ee';
      for (const point of image) {
        debugCtx.beginPath();
        debugCtx.arc(point.x * sourceSize.width, point.y * sourceSize.height, 4, 0, Math.PI * 2);
        debugCtx.fill();
      }
    }
  }, []);

  const matchLighting = useCallback((source: CanvasImageSource) => {
    engineRef.current?.ar.matchLighting(source);
  }, []);

  // Render loop: track every new video frame; in photo mode re-apply the single result so controls stay live.
  useEffect(() => {
    let frame = 0;
    let lastVideoTime = -1;
    let frameCount = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const engine = engineRef.current;
      if (!engine) return;
      const { mode } = liveRef.current;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (mode === 'camera' && video && landmarker && runningModeRef.current === 'VIDEO' && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        applyResult(landmarker.detectForVideo(video, performance.now()), true);
        if (frameCount++ % 15 === 0) matchLighting(video);
      } else if (mode === 'photo' && photoResultRef.current) {
        applyResult(photoResultRef.current, false);
      }

      engine.rig.tick(new Date());
      engine.ar.render();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [applyResult, matchLighting]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      stopCamera();
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    []
  );

  const setRunningMode = async (runningMode: 'VIDEO' | 'IMAGE') => {
    const landmarker = landmarkerRef.current;
    if (!landmarker || runningModeRef.current === runningMode) return;
    runningModeRef.current = runningMode;
    await landmarker.setOptions({ runningMode });
  };

  const resetTracking = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.rig.root.visible = false;
      engine.smoother.reset();
    }
    photoResultRef.current = null;
    missedFramesRef.current = 0;
    markHandFound(false);
  };

  const startCamera = async () => {
    setError(null);
    setBusy(true);
    try {
      resetTracking();
      await setRunningMode('VIDEO');
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setSourceSize({ width: video.videoWidth, height: video.videoHeight });
      setMode('camera');
    } catch (err) {
      console.error('[WristTryOn] Camera error', err);
      setError('Camera access was blocked or no camera was found. Allow camera access, or upload a photo instead.');
    } finally {
      setBusy(false);
    }
  };

  const handlePhoto = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      stopCamera();
      resetTracking();
      await setRunningMode('IMAGE');
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      const url = URL.createObjectURL(file);
      photoUrlRef.current = url;
      const image = imageRef.current!;
      image.src = url;
      await image.decode();
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      setMode('photo');
      const result = landmarkerRef.current!.detect(image);
      photoResultRef.current = result;
      matchLighting(image);
      if (!result.landmarks.length) {
        setError('No hand found in this photo. Use a photo where your hand and wrist are clearly visible.');
      }
    } catch (err) {
      console.error('[WristTryOn] Photo error', err);
      setError('Could not read that photo. Try a JPG or PNG.');
    } finally {
      setBusy(false);
    }
  };

  const saveSnapshot = () => {
    const glCanvas = glCanvasRef.current;
    const source = mode === 'camera' ? videoRef.current : imageRef.current;
    if (!glCanvas || !source) return;
    const { width, height } = sourceSize;
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const ctx = output.getContext('2d')!;
    if (mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, 0, 0, width, height);
    ctx.drawImage(glCanvas, 0, 0, width, height);
    const link = document.createElement('a');
    link.download = 'shopora-watch-try-on.png';
    link.href = output.toDataURL('image/png');
    link.click();
  };

  const layerStyle: React.CSSProperties = { transform: mirrored ? 'scaleX(-1)' : undefined };
  const aspect = sourceSize.width / sourceSize.height;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-2xl border border-slate-300 bg-neutral-900 shadow-xl"
          style={{ aspectRatio: `${sourceSize.width} / ${sourceSize.height}`, width: `min(100%, calc(70vh * ${aspect}))` }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-fill ${mode === 'camera' ? '' : 'hidden'}`}
            style={layerStyle}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            alt="Your photo"
            className={`absolute inset-0 h-full w-full object-fill ${mode === 'photo' ? '' : 'hidden'}`}
          />
          <canvas ref={glCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={layerStyle} />
          <canvas ref={debugCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={layerStyle} />

          {mode === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-200">
              {trackerReady ? (
                <>
                  <Hand className="h-10 w-10 text-amber-300" />
                  <p className="text-sm font-semibold">Start your camera or upload a photo of your wrist</p>
                </>
              ) : error ? null : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  <p className="text-sm font-semibold">Loading hand tracking model…</p>
                </>
              )}
            </div>
          )}

          {mode !== 'idle' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${handFound ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {handFound ? 'Wrist tracked' : 'Show the back of your hand and wrist'}
            </div>
          )}
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startCamera}
            disabled={!trackerReady || busy}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" /> {mode === 'camera' ? 'Restart camera' : 'Use camera'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!trackerReady || busy}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" /> Upload photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handlePhoto(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={!handFound}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Save snapshot
          </button>
        </div>
      </div>

      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Swatches title="Case" options={CASE_OPTIONS} value={style.caseFinish} onChange={(caseFinish) => setStyle((s) => ({ ...s, caseFinish }))} />
        <Swatches title="Strap" options={STRAP_OPTIONS} value={style.strap} onChange={(strap) => setStyle((s) => ({ ...s, strap }))} />
        <Swatches title="Dial" options={DIAL_OPTIONS} value={style.dial} onChange={(dial) => setStyle((s) => ({ ...s, dial }))} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Wrist fit</p>
            <span className="text-xs font-semibold text-slate-600">{Math.round(fit * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.25}
            step={0.01}
            value={fit}
            onChange={(event) => setFit(Number(event.target.value))}
            className="w-full accent-indigo-600"
          />
          <p className="text-[11px] text-slate-500">Adjust until the strap sits on your skin instead of floating or sinking in.</p>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setFlipSide((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              flipSide ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FlipHorizontal className="h-4 w-4" /> Dial on the palm side? Flip it
          </button>
          <button
            type="button"
            onClick={() => setDebug((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              debug ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bug className="h-4 w-4" /> Show landmarks and wrist occluder
          </button>
        </div>
      </aside>
    </div>
  );
}
