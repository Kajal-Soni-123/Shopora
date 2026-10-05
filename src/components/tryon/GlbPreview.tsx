'use client';

import React, { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Loader2 } from 'lucide-react';
import { normalizeWristModel, repairMissingNormals, stripLights } from '@/lib/try-on/ar/productModel';
import { isolateSingleEarring, normalizeEarringModel } from '@/lib/try-on/ar/earringModel';
import { isClosedNecklace, NECK_RADIUS_X, NECK_RADIUS_Z, normalizeNecklaceModel } from '@/lib/try-on/ar/necklaceModel';
import { WRIST_RADIUS_X, WRIST_RADIUS_Z } from '@/lib/try-on/ar/wristScene';
import type { ModelFitting, TryOnPlacement, WristItem } from '@/lib/try-on/tryOnModel';

export interface ModelDimensions {
  x: number;
  y: number;
  z: number;
}

interface GlbPreviewProps {
  url: string;
  fitting: ModelFitting;
  placement?: TryOnPlacement;
  wristItem?: WristItem;
  /** Receives the model as loaded, before alignment, e.g. to auto-align it. */
  onSceneLoaded?: (scene: THREE.Object3D) => void;
  onDimensions?: (dimensions: ModelDimensions) => void;
  onError?: (message: string) => void;
}

class PreviewErrorBoundary extends Component<
  { onError?: (message: string) => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[GlbPreview] Failed to load model', error);
    this.props.onError?.('This 3D model could not be loaded. Re-export it as glTF 2.0 binary (.glb).');
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center p-4 text-center text-xs font-medium text-red-600">
          Could not display this 3D model.
        </div>
      );
    }
    return this.props.children;
  }
}

/** Neutral studio reflections without downloading an HDR file. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = texture;
    return () => {
      scene.environment = null;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** A real-size translucent forearm, so the vendor can see how the product will sit on a customer. */
function WristGuide() {
  const geometry = useMemo(() => {
    const cylinder = new THREE.CylinderGeometry(1, 1, 0.14, 64, 1, true);
    cylinder.scale(WRIST_RADIUS_X, 1, WRIST_RADIUS_Z);
    cylinder.translate(0, -0.03, 0);
    return cylinder;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e8b99a" roughness={0.8} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** A real-size translucent earlobe at the attachment point, so the vendor can judge size and hang. */
function EarlobeGuide() {
  return (
    <mesh position={[0, 0.002, -0.004]} scale={[0.008, 0.011, 0.004]}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshStandardMaterial color="#e8b99a" roughness={0.8} transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

/**
 * A real-size translucent neck. A closed necklace wraps it; a flat (front-view) one hangs in front,
 * from the top of its chain.
 */
function NeckGuide({ closed }: { closed: boolean }) {
  const geometry = useMemo(() => {
    const cylinder = new THREE.CylinderGeometry(1, 1, 0.12, 48, 1, true);
    cylinder.scale(NECK_RADIUS_X, 1, NECK_RADIUS_Z);
    cylinder.translate(0, 0.05, closed ? 0 : -NECK_RADIUS_Z - 0.005);
    return cylinder;
  }, [closed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e8b99a" roughness={0.8} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Model({
  url,
  fitting,
  placement,
  wristItem,
  onDimensions,
  onSceneLoaded,
}: {
  url: string;
  fitting: ModelFitting;
  placement: TryOnPlacement;
  wristItem: WristItem;
  onDimensions?: (dimensions: ModelDimensions) => void;
  onSceneLoaded?: (scene: THREE.Object3D) => void;
}) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    onSceneLoaded?.(scene);
  }, [scene, onSceneLoaded]);
  const fittingKey = fitting.rotation.join(',') + ':' + fitting.scale;
  // Same normalisation the customer try-on uses, so what the vendor sees is what customers get.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => {
    const copy = scene.clone(true);
    stripLights(copy);
    repairMissingNormals(copy);
    if (placement === 'ear') return normalizeEarringModel(isolateSingleEarring(copy), fitting);
    if (placement === 'neck') return normalizeNecklaceModel(copy, fitting);
    return normalizeWristModel(copy, fitting, wristItem);
  }, [scene, fittingKey, placement, wristItem]);

  useEffect(() => {
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    onDimensions?.({ x: size.x, y: size.y, z: size.z });
  }, [model, onDimensions]);

  return (
    <>
      {placement === 'neck' && <NeckGuide closed={isClosedNecklace(model)} />}
      <primitive object={model} />
    </>
  );
}

export default function GlbPreview({
  url,
  fitting,
  placement = 'wrist',
  wristItem = 'watch',
  onDimensions,
  onError,
  onSceneLoaded,
}: GlbPreviewProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const handleDimensions = useCallback(
    (dimensions: ModelDimensions) => {
      setLoadedUrl(url);
      onDimensions?.(dimensions);
    },
    [url, onDimensions]
  );

  return (
    <PreviewErrorBoundary key={url} onError={onError}>
      <div className="relative h-full w-full">
        <Canvas camera={{ fov: 30, position: [0, 0, 0.4], near: 0.001, far: 10 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <StudioEnvironment />
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.15}>
              {placement === 'ear' ? <EarlobeGuide /> : placement === 'wrist' ? <WristGuide /> : null}
              <Model url={url} fitting={fitting} placement={placement} wristItem={wristItem} onDimensions={handleDimensions} onSceneLoaded={onSceneLoaded} />
            </Bounds>
          </Suspense>
          <OrbitControls makeDefault enablePan={false} />
        </Canvas>
        {loadedUrl !== url && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D preview…
          </div>
        )}
      </div>
    </PreviewErrorBoundary>
  );
}
