'use client';

import React, { Suspense, useRef, useState, useMemo, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RotateCw, Maximize2, Minimize2, RefreshCw, AlertTriangle, Loader2, Sparkles, User } from 'lucide-react';

export type Category = 'men' | 'women' | 'children';

export const MANNEQUIN_URLS: Record<Category, string> = {
  men: '/models/mannequin-male.glb',
  women: '/models/mannequin-female.glb',
  children: '/models/mannequin-child.glb',
};

// Fallback CDN URLs if requested
export const RPM_MANNEQUIN_URLS: Record<Category, string> = {
  men: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  women: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a7.glb',
  children: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a8.glb',
};

interface ErrorBoundaryProps {
  fallback: (error: Error) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Mannequin Viewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// Realistic Store Mannequin Model
function RealisticMannequin({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const { mannequinScene, targetPosition, targetScale } = useMemo(() => {
    const cloned = scene.clone(true);

    // Override all mesh materials with smooth matte-finished cream/tan store mannequin material
    const mannequinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8d5c4'),
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        // Hide facial details, hair, eyes, teeth if present in Ready Player Me GLB
        if (
          name.includes('hair') ||
          name.includes('eye') ||
          name.includes('teeth') ||
          name.includes('beard') ||
          name.includes('head_mesh')
        ) {
          mesh.visible = false;
        } else {
          mesh.material = mannequinMaterial;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });

    // Compute bounding box to automatically center & normalize model scale
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = maxDim > 0 ? (size.y > 0 ? 1.8 / size.y : 1.8 / maxDim) : 1;

    // Center model at origin with feet grounded at y = -0.9
    const posX = -center.x * scaleFactor;
    const posY = -box.min.y * scaleFactor - 0.9;
    const posZ = -center.z * scaleFactor;

    return {
      mannequinScene: cloned,
      targetPosition: [posX, posY, posZ] as [number, number, number],
      targetScale: [scaleFactor, scaleFactor, scaleFactor] as [number, number, number],
    };
  }, [scene]);

  return (
    <group position={targetPosition} scale={targetScale}>
      <primitive object={mannequinScene} />
    </group>
  );
}

// Preload local mannequin GLB assets
useGLTF.preload(MANNEQUIN_URLS.men);
useGLTF.preload(MANNEQUIN_URLS.women);
useGLTF.preload(MANNEQUIN_URLS.children);

// Skeleton loader
function ViewerSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#f5f5f5]/90 backdrop-blur-sm flex flex-col items-center justify-center text-slate-700 z-10 animate-pulse">
      <Loader2 className="w-10 h-10 animate-spin text-neutral-800 mb-3" />
      <p className="text-sm font-semibold text-neutral-800">Loading Realistic Store Mannequin...</p>
    </div>
  );
}

export default function PrototypeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [category, setCategory] = useState<Category>('men');
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useCdnFallback, setUseCdnFallback] = useState(false);

  const activeUrl = useCdnFallback ? RPM_MANNEQUIN_URLS[category] : MANNEQUIN_URLS[category];

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleToggleAutoRotate = () => {
    setAutoRotate((prev) => !prev);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        console.error('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[640px] bg-[#f5f5f5] rounded-2xl overflow-hidden border border-slate-300 shadow-xl ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : ''
      }`}
    >
      {/* Category Switching Selector UI */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Category:</span>
          {(['men', 'women', 'children'] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                category === cat
                  ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/20 scale-105'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat === 'men' ? '👨 Men' : cat === 'women' ? '👩 Women' : '🧒 Children'}
            </button>
          ))}
        </div>
      </div>

      {/* Overlaid Top-Right Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          title="Reset camera view"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset camera</span>
        </button>

        <button
          onClick={handleToggleAutoRotate}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            autoRotate
              ? 'bg-neutral-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Toggle 360 rotation"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          <span>Toggle auto-rotate</span>
        </button>

        <button
          onClick={handleToggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>Fullscreen</span>
        </button>
      </div>

      {/* 3D Scene Canvas */}
      <CanvasErrorBoundary
        fallback={(err) => {
          console.warn('Local mannequin GLB load failed, trying RPM CDN URL:', err);
          if (!useCdnFallback) {
            setUseCdnFallback(true);
          }
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-50">
              <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Failed to load mannequin GLB</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">{err.message}</p>
            </div>
          );
        }}
      >
        <Suspense fallback={<ViewerSkeleton />}>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 1.4, 3.5], fov: 35 }}
            aria-label="3D store mannequin preview. Use arrow keys to rotate."
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <color attach="background" args={['#f5f5f5']} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 4, -5]} intensity={0.4} />
            <Environment preset="studio" />
            <ContactShadows position={[0, -1, 0]} opacity={0.5} blur={2.5} far={4} />

            <RealisticMannequin key={activeUrl} url={activeUrl} />

            <OrbitControls
              ref={controlsRef}
              autoRotate={autoRotate}
              autoRotateSpeed={2}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1.5}
              maxDistance={6}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        </Suspense>
      </CanvasErrorBoundary>

      {/* Footer Info Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-600 shadow-sm flex items-center gap-3 font-medium">
          <span>✨ Category: <strong className="capitalize text-neutral-900">{category}</strong></span>
          <span className="text-slate-300">•</span>
          <span>🖱️ Left Click + Drag: Rotate 360°</span>
          <span className="text-slate-300">•</span>
          <span>Scroll / Pinch: Zoom</span>
          <span className="text-slate-300">•</span>
          <span>Right Click + Drag: Pan</span>
        </div>
      </div>
    </div>
  );
}
