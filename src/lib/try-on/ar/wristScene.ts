import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Average adult wrist cross-section in metres (about 54 × 38 mm): wider across than front-to-back.
export const WRIST_RADIUS_X = 0.027;
export const WRIST_RADIUS_Z = 0.019;

/** Invisible wrist that writes depth only, so whatever wraps behind the arm is hidden. */
export function createWristOccluder(): THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial> {
  const geometry = new THREE.CylinderGeometry(1, 1, 0.16, 64);
  geometry.scale(WRIST_RADIUS_X - 0.0005, 1, WRIST_RADIUS_Z - 0.0005);
  geometry.translate(0, -0.04, 0);
  const occluder = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -1;
  return occluder;
}

/** A soft transparent-black texture; `radial` for under the case, otherwise a band fading at both edges. */
function shadowTexture(radial: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = radial
    ? ctx.createRadialGradient(64, 64, 10, 64, 64, 64)
    : ctx.createLinearGradient(0, 0, 0, 128);
  if (radial) {
    gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.3, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.45)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function shadowMesh(geometry: THREE.BufferGeometry, radial: boolean): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: shadowTexture(radial), transparent: true, depthWrite: false })
  );
  mesh.renderOrder = 1;
  return mesh;
}

/** Soft contact shadows on the skin: a band under the strap and a patch under the case. */
export function createContactShadows({ bandWidth, caseRadius }: { bandWidth: number; caseRadius: number }): THREE.Group {
  const group = new THREE.Group();

  const band = new THREE.CylinderGeometry(1, 1, bandWidth * 1.7, 96, 1, true);
  band.scale(WRIST_RADIUS_X + 0.0003, 1, WRIST_RADIUS_Z + 0.0003);
  group.add(shadowMesh(band, false));

  const patch = new THREE.PlaneGeometry(caseRadius * 2.8, caseRadius * 2.8);
  patch.translate(0, 0, WRIST_RADIUS_Z + 0.0004);
  group.add(shadowMesh(patch, true));

  return group;
}

/** Disposes every mesh geometry, material and texture under `root`. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

/**
 * Transparent renderer + scene in source-image pixel space (origin bottom-left, y up),
 * lit by a studio environment whose exposure and tint follow the photo or video.
 */
export class ArScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10000, 10000);
  private readonly hemisphere = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.5);
  private readonly environment: THREE.Texture;
  private readonly sampler = document.createElement('canvas');

  constructor(canvas?: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(-0.4, 1, 1);
    this.scene.add(keyLight, this.hemisphere);
  }

  setSourceSize(width: number, height: number) {
    this.camera.right = width;
    this.camera.top = height;
    this.camera.updateProjectionMatrix();
  }

  /** Match exposure and ambient tint to the scene so the product doesn't look studio-lit on a dim photo. */
  matchLighting(source: CanvasImageSource) {
    this.sampler.width = this.sampler.height = 24;
    const ctx = this.sampler.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, 24, 24);
    const { data } = ctx.getImageData(0, 0, 24, 24);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const pixels = (data.length / 4) * 255;
    r /= pixels;
    g /= pixels;
    b /= pixels;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    this.renderer.toneMappingExposure = THREE.MathUtils.clamp(0.5 + luminance * 1.4, 0.55, 1.6);
    const peak = Math.max(r, g, b, 0.01);
    this.hemisphere.color.setRGB(r / peak, g / peak, b / peak);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.environment.dispose();
    this.renderer.dispose();
  }
}
