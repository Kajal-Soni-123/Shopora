import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const WristTryOn = dynamic(() => import('./WristTryOn'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full flex-col items-center justify-center rounded-2xl border border-slate-300 bg-neutral-900 text-slate-200">
      <Loader2 className="mb-3 h-8 w-8 animate-spin" />
      <p className="text-sm font-semibold">Initializing AR canvas…</p>
    </div>
  ),
});

export const metadata = {
  title: 'Wrist AR Try-On Prototype - Shopora',
  description: 'Real-time 3D watch try-on using in-browser hand tracking, wrist occlusion and scene-matched lighting.',
};

const TIPS = [
  {
    title: 'How it works',
    body: 'MediaPipe finds 21 hand landmarks in the browser. They give the wrist position, its 3D rotation and the image scale, and three.js renders a real 3D watch at that pose.',
  },
  {
    title: 'Why it looks worn',
    body: 'An invisible wrist cylinder hides the part of the strap that goes behind your arm. Soft contact shadows sit on the skin, and exposure and tint follow your lighting.',
  },
  {
    title: 'Best results',
    body: 'Back of the hand toward the camera, forearm visible, even lighting. Use the fit slider if the strap floats above or sinks into the skin.',
  },
];

export default function WristTryOnPrototypePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-slate-300 pb-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
              Prototype
            </span>
            <span className="text-xs font-medium text-slate-500">No paid API · runs in the browser</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Wrist AR Watch Try-On</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live 3D watch that wraps around your wrist, instead of a flat product photo pasted on top.
          </p>
        </header>

        <WristTryOn />

        <div className="grid gap-4 text-xs md:grid-cols-3">
          {TIPS.map((tip) => (
            <div key={tip.title} className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="font-bold text-slate-800">{tip.title}</h4>
              <p className="text-slate-600">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
