import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const PrototypeViewer = dynamic(() => import('./PrototypeViewer'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[640px] bg-[#f5f5f5] rounded-2xl overflow-hidden border border-slate-300 shadow-xl flex flex-col items-center justify-center text-slate-700 animate-pulse">
      <Loader2 className="w-10 h-10 animate-spin text-neutral-800 mb-3" />
      <p className="text-sm font-semibold text-neutral-800">Initializing 3D Canvas Context...</p>
    </div>
  ),
});

export const metadata = {
  title: 'Realistic 3D Store Mannequin Prototype - Shopora',
  description: 'Interactive realistic 3D store mannequin viewer supporting Men, Women, and Children categories.',
};

export default function Standalone3DViewerPrototypePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="max-w-5xl w-full space-y-6">
        {/* Prototype Header */}
        <div className="border-b border-slate-300 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white uppercase tracking-wider">
                Phase 1 Prototype
              </span>
              <span className="text-xs font-medium text-slate-500">Realistic Store Mannequins</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Interactive 3D Store Mannequin Viewer
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Realistic, featureless fashion mannequins with Category switching (Men, Women, Children) & Studio Lighting.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Interactive Demo</span>
          </div>
        </div>

        {/* 3D Canvas Viewer */}
        <PrototypeViewer />

        {/* Technical Specs / Prototype Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <h4 className="font-bold text-slate-800">👗 Mannequin Assets</h4>
            <p className="text-slate-600">
              Smooth matte store mannequin GLB assets (`mannequin-male.glb`, `mannequin-female.glb`, `mannequin-child.glb`) in `public/models/`.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <h4 className="font-bold text-slate-800">✨ Material & Finish</h4>
            <p className="text-slate-600">
              Neutral cream finish (`#e8d5c4`, `roughness: 0.6`, `metalness: 0.05`), featureless face & smooth anatomy contours.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <h4 className="font-bold text-slate-800">💡 Studio Lighting</h4>
            <p className="text-slate-600">
              Studio Environment, `#f5f5f5` studio backdrop, contact shadows (`opacity: 0.5`, `blur: 2.5`), 360° rotation & zoom.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
