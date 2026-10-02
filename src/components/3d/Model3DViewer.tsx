'use client';

import React, { Suspense, useRef, useState, useMemo, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, useTexture, Decal } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RotateCw, Maximize2, Minimize2, RefreshCw, AlertTriangle, Loader2, Sparkles, Shirt, Layers } from 'lucide-react';

export type CategoryKey = 'men' | 'women' | 'children';

export const MANNEQUIN_MODELS: Record<CategoryKey, string> = {
  men: '/models/mannequin-male.glb',
  women: '/models/mannequin-female.glb',
  children: '/models/mannequin-child.glb',
};

// Map store category strings to mannequin category key
export function getCategoryKey(categoryName?: string): CategoryKey {
  if (!categoryName) return 'men';
  const cat = categoryName.toLowerCase();
  if (cat.includes('women') || cat.includes('female') || cat.includes('lady') || cat.includes('dress') || cat.includes('saree')) {
    return 'women';
  }
  if (cat.includes('child') || cat.includes('kid') || cat.includes('boy') || cat.includes('girl') || cat.includes('baby')) {
    return 'children';
  }
  return 'men';
}

interface Model3DViewerProps {
  category?: string;
  productImage?: string;
  productTitle?: string;
  initialSize?: string;
  onSizeChange?: (size: string) => void;
  className?: string;
}

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
    console.error('Model3DViewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// Inner Garment Texture Overlay Component
function GarmentOverlay({ textureUrl }: { textureUrl?: string }) {
  if (!textureUrl) return null;

  try {
    const texture = useTexture(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return (
      <mesh position={[0, 0.22, 0.16]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.55, 0.7]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.92}
          roughness={0.4}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  } catch (err) {
    console.warn('Garment texture load skipped:', err);
    return null;
  }
}

// Interactive Production Store Mannequin Model Component
function ProductionMannequin({
  url,
  productImage,
  fitSize,
}: {
  url: string;
  productImage?: string;
  fitSize: string;
}) {
  const { scene } = useGLTF(url);

  // Size Fitting Scale Factor (S, M, L, XL)
  const sizeScaleFactor = useMemo(() => {
    switch (fitSize.toUpperCase()) {
      case 'XS':
        return 0.92;
      case 'S':
        return 0.96;
      case 'M':
        return 1.0;
      case 'L':
        return 1.05;
      case 'XL':
        return 1.1;
      case 'XXL':
        return 1.15;
      default:
        return 1.0;
    }
  }, [fitSize]);

  const { mannequinScene, targetPosition, targetScale } = useMemo(() => {
    const cloned = scene.clone(true);

    const mannequinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8d5c4'), // Cream/tan store mannequin finish
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        // Hide facial details / hair / eyes if present
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

    // Compute bounding box for centering and height normalization
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const baseScale = maxDim > 0 ? (size.y > 0 ? 1.7 / size.y : 1.7 / maxDim) : 1;
    const finalScale = baseScale * sizeScaleFactor;

    // Center the mannequin model at origin (0, 0, 0)
    const posX = -center.x * finalScale;
    const posY = -center.y * finalScale;
    const posZ = -center.z * finalScale;

    return {
      mannequinScene: cloned,
      targetPosition: [posX, posY, posZ] as [number, number, number],
      targetScale: [finalScale, finalScale, finalScale] as [number, number, number],
    };
  }, [scene, sizeScaleFactor]);

  return (
    <group position={targetPosition} scale={targetScale}>
      <primitive object={mannequinScene} />
      {productImage && (
        <Suspense fallback={null}>
          <GarmentOverlay textureUrl={productImage} />
        </Suspense>
      )}
    </group>
  );
}

// Preload mannequins
useGLTF.preload(MANNEQUIN_MODELS.men);
useGLTF.preload(MANNEQUIN_MODELS.women);
useGLTF.preload(MANNEQUIN_MODELS.children);

function ViewerSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#f8fafc]/90 backdrop-blur-sm flex flex-col items-center justify-center text-slate-700 z-10 animate-pulse">
      <Loader2 className="w-10 h-10 animate-spin text-neutral-800 mb-3" />
      <p className="text-sm font-semibold text-neutral-800">Loading 3D Fit Studio...</p>
    </div>
  );
}

export default function Model3DViewer({
  category = 'men',
  productImage,
  productTitle = 'Garment',
  initialSize = 'M',
  onSizeChange,
  className = '',
}: Model3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(() => getCategoryKey(category));
  const [fitSize, setFitSize] = useState<string>(initialSize);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeUrl = MANNEQUIN_MODELS[activeCategory];

  const handleSizeSelect = (sz: string) => {
    setFitSize(sz);
    if (onSizeChange) onSizeChange(sz);
  };

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
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[540px] md:h-[600px] bg-[#f5f5f5] rounded-2xl overflow-hidden border border-slate-200 shadow-lg ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : ''
      } ${className}`}
    >
      {/* Category Selector Badge & Fitting Controls Header */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">Mannequin:</span>
          {(['men', 'women', 'children'] as CategoryKey[]).map((catKey) => (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeCategory === catKey
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {catKey === 'men' ? '👨 Male' : catKey === 'women' ? '👩 Female' : '🧒 Child'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={handleToggleAutoRotate}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
            autoRotate ? 'bg-neutral-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Toggle 360 Rotate"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">360°</span>
        </button>

        <button
          onClick={handleToggleFullscreen}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Interactive Size Fitting Controller (Floating Bottom Bar) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-md">
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200">
          <Shirt className="w-4 h-4 text-neutral-800" />
          <span className="text-xs font-bold text-neutral-800">Fit Size:</span>
        </div>
        <div className="flex items-center gap-1">
          {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
            <button
              key={sz}
              onClick={() => handleSizeSelect(sz)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                fitSize === sz
                  ? 'bg-neutral-900 text-white scale-105 shadow-md shadow-neutral-900/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* 3D R3F Canvas */}
      <CanvasErrorBoundary
        fallback={(err) => (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-50">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
            <p className="text-sm font-medium text-slate-800">3D Mannequin Preview Unavailable</p>
            <p className="text-xs text-slate-500 max-w-xs">{err.message}</p>
          </div>
        )}
      >
        <Suspense fallback={<ViewerSkeleton />}>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 0, 3.2], fov: 40 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <color attach="background" args={['#f5f5f5']} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 4, -5]} intensity={0.4} />
            <Environment preset="studio" />
            <ContactShadows position={[0, -1, 0]} opacity={0.5} blur={2.5} far={4} />

            <ProductionMannequin
              key={`${activeUrl}-${fitSize}`}
              url={activeUrl}
              productImage={productImage}
              fitSize={fitSize}
            />

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
    </div>
  );
}
