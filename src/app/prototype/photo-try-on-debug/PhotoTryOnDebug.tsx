'use client';

import React, { useState } from 'react';
import { createHandLandmarker, createSkinSegmenter } from '@/lib/try-on/ar/handTracker';
import { loadWristModel, parseFitting } from '@/lib/try-on/ar/productModel';
import { PhotoTryOnRenderer } from '@/lib/try-on/ar/photoTryOn';

declare global {
  interface Window {
    __tryOnDebug?: unknown;
  }
}

/**
 * Runs the customer photo try-on pipeline on one photo and prints its numbers.
 * Query: ?model=<glb url>&rotation=1,3,2|auto&fit=1&flip=1&skin=0&crop=x,y,w,h
 */
export default function PhotoTryOnDebug() {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<string>('Choose a photo.');

  const run = async (file: File) => {
    const params = new URLSearchParams(window.location.search);
    const modelUrl = params.get('model') || '';
    const rotation = (params.get('rotation') || '0,0,0').split(',').map(Number);
    const fit = Number(params.get('fit') || '1');
    const flipSide = params.get('flip') === '1';
    const crop = params.get('crop')?.split(',').map(Number);

    try {
      setInfo('Running…');
      const source = new Image();
      source.src = URL.createObjectURL(file);
      await source.decode();

      const [x, y, w, h] = crop ?? [0, 0, source.naturalWidth, source.naturalHeight];
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(source, x, y, w, h, 0, 0, w, h);
      const photo = new Image();
      photo.src = canvas.toDataURL('image/png');
      await photo.decode();

      const useSkin = params.get('skin') !== '0';
      const [landmarker, segmenter, model] = await Promise.all([
        createHandLandmarker('IMAGE'),
        useSkin ? createSkinSegmenter() : Promise.resolve(undefined),
        loadWristModel(modelUrl, params.get('rotation') === 'auto' ? 'auto' : parseFitting({ rotation })),
      ]);
      const renderer = new PhotoTryOnRenderer(model);
      const found = renderer.setPhoto(photo, landmarker, segmenter);
      const output = found ? renderer.render({ fit, flipSide }) : null;
      const debug = { found, ...renderer.debugInfo() };

      if (output) {
        // Overlay the landmarks so tracking quality is visible.
        const ctx = output.getContext('2d')!;
        ctx.fillStyle = '#22d3ee';
        for (const p of debug.landmarks ?? []) {
          ctx.beginPath();
          ctx.arc(p.x * output.width, p.y * output.height, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Measured forearm: centre point and the width line across the arm.
        if (debug.forearm) {
          const { centre, towardElbow, widthPx } = debug.forearm;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centre.x + towardElbow.y * widthPx / 2, centre.y - towardElbow.x * widthPx / 2);
          ctx.lineTo(centre.x - towardElbow.y * widthPx / 2, centre.y + towardElbow.x * widthPx / 2);
          ctx.stroke();
        }
        setResultUrl(output.toDataURL('image/png'));
      }
      window.__tryOnDebug = debug;
      setInfo(JSON.stringify({ ...debug, landmarks: undefined, worldLandmarks: undefined }, null, 2));
    } catch (err) {
      window.__tryOnDebug = { error: String(err) };
      setInfo(`Error: ${String(err)}`);
    }
  };

  return (
    <main className="space-y-4 p-6">
      <input
        id="photo"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) run(file);
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {resultUrl && <img id="result" src={resultUrl} alt="Try-on debug result" className="max-w-full" />}
      <pre id="info" className="whitespace-pre-wrap text-xs">
        {info}
      </pre>
    </main>
  );
}
