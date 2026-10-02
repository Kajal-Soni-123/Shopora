import * as THREE from 'three';
import { createContactShadows, createWristOccluder, disposeObject, WRIST_RADIUS_X, WRIST_RADIUS_Z } from './wristScene';

export type CaseFinish = 'rose-gold' | 'steel' | 'black';
export type StrapStyle = 'brown-leather' | 'black-leather' | 'metal';
export type DialColor = 'navy' | 'white' | 'green';

export interface WatchStyle {
  caseFinish: CaseFinish;
  strap: StrapStyle;
  dial: DialColor;
}

const STRAP_WIDTH = 0.02;
const STRAP_THICKNESS = 0.0025;
const CASE_RADIUS = 0.0195;
const CASE_HEIGHT = 0.009;

const CASE_FINISHES: Record<CaseFinish, { color: string; roughness: number }> = {
  'rose-gold': { color: '#e3a98c', roughness: 0.22 },
  steel: { color: '#d4d8dd', roughness: 0.18 },
  black: { color: '#2b2b30', roughness: 0.35 },
};

const STRAPS: Record<Exclude<StrapStyle, 'metal'>, { color: string; roughness: number }> = {
  'brown-leather': { color: '#6b3f24', roughness: 0.75 },
  'black-leather': { color: '#1d1c1f', roughness: 0.7 },
};

const DIALS: Record<DialColor, { inner: string; outer: string; ink: string }> = {
  navy: { inner: '#24407a', outer: '#0f1b36', ink: '#f4efe6' },
  white: { inner: '#fbfaf6', outer: '#dcd7cb', ink: '#1b1b1f' },
  green: { inner: '#24694f', outer: '#0c3327', ink: '#f1ece0' },
};

function drawDial(ctx: CanvasRenderingContext2D, dial: (typeof DIALS)[DialColor], now: Date) {
  const size = ctx.canvas.width;
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  const face = ctx.createRadialGradient(c * 0.8, c * 0.7, size * 0.05, c, c, c);
  face.addColorStop(0, dial.inner);
  face.addColorStop(1, dial.outer);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dial.ink;
  ctx.strokeStyle = dial.ink;
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    if (major) ctx.fillRect(-size * 0.012, -c * 0.92, size * 0.024, c * (i === 0 ? 0.2 : 0.14));
    else ctx.fillRect(-size * 0.003, -c * 0.92, size * 0.006, c * 0.05);
    ctx.restore();
  }

  ctx.font = `600 ${size * 0.055}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SHOPORA', c, c * 0.55);
  ctx.font = `${size * 0.032}px Georgia, serif`;
  ctx.fillText('AUTOMATIC', c, c * 1.52);

  const hand = (angle: number, length: number, width: number, color: string) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-width / 2, c * 0.12);
    ctx.lineTo(-width / 4, -length);
    ctx.lineTo(width / 4, -length);
    ctx.lineTo(width / 2, c * 0.12);
    ctx.fill();
    ctx.restore();
  };
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  hand((hours / 12) * Math.PI * 2, c * 0.5, size * 0.04, dial.ink);
  hand((minutes / 60) * Math.PI * 2, c * 0.78, size * 0.03, dial.ink);
  hand((seconds / 60) * Math.PI * 2, c * 0.86, size * 0.01, '#d9534f');
  ctx.fillStyle = dial.ink;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.025, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A procedural wristwatch in metre units, built around the wrist's local frame
 * (+Y toward the fingers, +Z out of the back of the hand). The strap wraps around Y, so the
 * 12–6 line runs across the wrist and the crown (3 o'clock) points toward the hand. Apply the tracked pose to `root`.
 */
export class WatchRig {
  readonly root = new THREE.Group();

  private readonly occluder = createWristOccluder();
  private readonly occluderMaterial = this.occluder.material;
  private readonly occluderDebugMaterial = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  });
  private readonly caseMaterial = new THREE.MeshStandardMaterial({ metalness: 1 });
  private readonly strapMaterial = new THREE.MeshStandardMaterial();
  private readonly dialCanvas = document.createElement('canvas');
  private readonly dialTexture: THREE.CanvasTexture;
  private readonly crown: THREE.Mesh;
  private dial = DIALS.navy;
  private lastDrawnSecond = -1;

  constructor(style: WatchStyle) {
    this.root.add(this.occluder);

    // Band that hugs the wrist ellipse, extruded along the arm.
    const outline = new THREE.Shape().absellipse(0, 0, WRIST_RADIUS_X + STRAP_THICKNESS, WRIST_RADIUS_Z + STRAP_THICKNESS, 0, Math.PI * 2, false);
    outline.holes.push(new THREE.Path().absellipse(0, 0, WRIST_RADIUS_X, WRIST_RADIUS_Z, 0, Math.PI * 2, true));
    const strapGeometry = new THREE.ExtrudeGeometry(outline, {
      depth: STRAP_WIDTH,
      curveSegments: 96,
      bevelEnabled: true,
      bevelThickness: 0.0006,
      bevelSize: 0.0005,
      bevelSegments: 2,
    });
    strapGeometry.translate(0, 0, -STRAP_WIDTH / 2);
    strapGeometry.rotateX(-Math.PI / 2);
    this.root.add(new THREE.Mesh(strapGeometry, this.strapMaterial));

    this.root.add(createContactShadows({ bandWidth: STRAP_WIDTH, caseRadius: CASE_RADIUS }));

    const caseBottom = WRIST_RADIUS_Z + STRAP_THICKNESS - 0.0015;
    const caseCentre = caseBottom + CASE_HEIGHT / 2;
    const caseTop = caseBottom + CASE_HEIGHT;

    const caseGeometry = new THREE.CylinderGeometry(CASE_RADIUS, CASE_RADIUS * 1.04, CASE_HEIGHT, 96);
    caseGeometry.rotateX(Math.PI / 2);
    const watchCase = new THREE.Mesh(caseGeometry, this.caseMaterial);
    watchCase.position.z = caseCentre;
    this.root.add(watchCase);

    for (const alongArm of [-0.0075, 0.0075]) {
      for (const side of [-1, 1]) {
        // Lugs sit where the strap leaves the case, across the wrist.
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0032, 0.0035), this.caseMaterial);
        lug.position.set(side * (CASE_RADIUS + 0.0018), alongArm, caseCentre - 0.001);
        this.root.add(lug);
      }
    }

    const bezel = new THREE.Mesh(new THREE.TorusGeometry(CASE_RADIUS - 0.0008, 0.0013, 24, 128), this.caseMaterial);
    bezel.position.z = caseTop;
    this.root.add(bezel);

    this.dialCanvas.width = this.dialCanvas.height = 512;
    this.dialTexture = new THREE.CanvasTexture(this.dialCanvas);
    this.dialTexture.colorSpace = THREE.SRGBColorSpace;
    this.dialTexture.anisotropy = 4;
    const dialFace = new THREE.Mesh(
      new THREE.CircleGeometry(CASE_RADIUS - 0.0021, 96),
      new THREE.MeshStandardMaterial({ map: this.dialTexture, roughness: 0.45, metalness: 0.1 })
    );
    dialFace.position.z = caseTop + 0.0002;
    // Turn the dial so 12 o'clock points across the wrist (-X) and 3 o'clock toward the fingers (+Y).
    dialFace.rotation.z = Math.PI / 2;
    this.root.add(dialFace);

    const crystal = new THREE.Mesh(
      new THREE.CircleGeometry(CASE_RADIUS - 0.0012, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
        roughness: 0.02,
        clearcoat: 1,
        envMapIntensity: 2.5,
        depthWrite: false,
      })
    );
    crystal.position.z = caseTop + 0.0011;
    this.root.add(crystal);

    const crownGeometry = new THREE.CylinderGeometry(0.0022, 0.0022, 0.0032, 32);
    this.crown = new THREE.Mesh(crownGeometry, this.caseMaterial);
    this.crown.position.set(0, CASE_RADIUS + 0.0014, caseCentre);
    this.root.add(this.crown);

    this.setStyle(style);
  }

  setStyle(style: WatchStyle) {
    const finish = CASE_FINISHES[style.caseFinish];
    this.caseMaterial.color.set(finish.color);
    this.caseMaterial.roughness = finish.roughness;

    if (style.strap === 'metal') {
      this.strapMaterial.color.set(finish.color);
      this.strapMaterial.metalness = 1;
      this.strapMaterial.roughness = finish.roughness + 0.12;
    } else {
      this.strapMaterial.color.set(STRAPS[style.strap].color);
      this.strapMaterial.metalness = 0;
      this.strapMaterial.roughness = STRAPS[style.strap].roughness;
    }

    this.dial = DIALS[style.dial];
    this.lastDrawnSecond = -1;
    this.tick(new Date());
  }

  /** The canvas showing the scene is CSS-mirrored for selfie view; keep the dial text readable. */
  setMirrored(mirrored: boolean) {
    this.dialTexture.repeat.x = mirrored ? -1 : 1;
    this.dialTexture.offset.x = mirrored ? 1 : 0;
  }

  setDebug(debug: boolean) {
    this.occluder.material = debug ? this.occluderDebugMaterial : this.occluderMaterial;
  }

  /** Redraws the dial when the second changes, so the watch shows the live time. */
  tick(now: Date) {
    if (now.getSeconds() === this.lastDrawnSecond) return;
    this.lastDrawnSecond = now.getSeconds();
    drawDial(this.dialCanvas.getContext('2d')!, this.dial, now);
    this.dialTexture.needsUpdate = true;
  }

  dispose() {
    disposeObject(this.root);
    this.occluderMaterial.dispose();
    this.occluderDebugMaterial.dispose();
  }
}
