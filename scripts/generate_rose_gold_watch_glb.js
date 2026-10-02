const fs = require('fs');
const path = require('path');

// Polyfill FileReader & Blob for GLTFExporter in Node.js
global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    setTimeout(() => {
      this.result = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
};

global.Blob = class Blob {
  constructor(buffers) {
    this.buffer = Buffer.concat(buffers.map(b => Buffer.from(b)));
    this.byteOffset = this.buffer.byteOffset;
    this.byteLength = this.buffer.byteLength;
  }
};

const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

// Create rounded cushion shape
function createRoundedCushionShape(size, radius) {
  const shape = new THREE.Shape();
  const half = size / 2;
  const r = Math.min(radius, half);

  shape.moveTo(-half + r, -half);
  shape.lineTo(half - r, -half);
  shape.quadraticCurveTo(half, -half, half, -half + r);
  shape.lineTo(half, half - r);
  shape.quadraticCurveTo(half, half, half - r, half);
  shape.lineTo(-half + r, half);
  shape.quadraticCurveTo(-half, half, -half, half - r);
  shape.lineTo(-half, -half + r);
  shape.quadraticCurveTo(-half, -half, -half + r, -half);

  return shape;
}

function buildRoseGoldWatchGroup() {
  const watchGroup = new THREE.Group();
  watchGroup.name = 'ChronoLuxe_RoseGold_SquareWatch';

  // Materials
  const roseGoldMaterial = new THREE.MeshStandardMaterial({
    color: 0xC88977,
    metalness: 0.92,
    roughness: 0.22,
    name: 'RoseGold_Polished'
  });

  const roseGoldAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0xDC9B8B,
    metalness: 0.95,
    roughness: 0.15,
    name: 'RoseGold_Shiny'
  });

  const dialMaterial = new THREE.MeshStandardMaterial({
    color: 0xF5ECE7,
    metalness: 0.12,
    roughness: 0.35,
    name: 'Dial_BlushPink'
  });

  const darkRomanMaterial = new THREE.MeshStandardMaterial({
    color: 0x5C382F,
    metalness: 0.6,
    roughness: 0.3,
    name: 'Roman_Markers'
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    transmission: 0.9,
    ior: 1.5,
    name: 'Sapphire_Glass'
  });

  const cushionPillowMaterial = new THREE.MeshStandardMaterial({
    color: 0xF6F2EB,
    roughness: 0.88,
    metalness: 0.02,
    name: 'Display_Pillow'
  });

  // 1. WATCH CASE (Square Cushion)
  const caseWidth = 0.040; // 40mm
  const caseThickness = 0.008; // 8mm
  const caseCornerRadius = 0.009; // 9mm

  const caseShape = createRoundedCushionShape(caseWidth, caseCornerRadius);
  const extrudeSettings = {
    depth: caseThickness,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.001,
    bevelThickness: 0.001
  };

  const caseGeometry = new THREE.ExtrudeGeometry(caseShape, extrudeSettings);
  caseGeometry.center();
  const caseMesh = new THREE.Mesh(caseGeometry, roseGoldMaterial);
  caseMesh.name = 'Watch_Case';
  watchGroup.add(caseMesh);

  // 2. BEZEL (Elevated Cushion Frame)
  const bezelShape = createRoundedCushionShape(caseWidth * 0.94, caseCornerRadius * 0.9);
  const bezelHole = createRoundedCushionShape(caseWidth * 0.78, caseCornerRadius * 0.7);
  bezelShape.holes.push(bezelHole);

  const bezelExtrude = {
    depth: 0.0025,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.0006,
    bevelThickness: 0.0006
  };

  const bezelGeometry = new THREE.ExtrudeGeometry(bezelShape, bezelExtrude);
  bezelGeometry.center();
  const bezelMesh = new THREE.Mesh(bezelGeometry, roseGoldAccentMaterial);
  bezelMesh.position.z = caseThickness / 2 + 0.001;
  bezelMesh.name = 'Watch_Bezel';
  watchGroup.add(bezelMesh);

  // 3. DIAL FACE
  const dialShape = createRoundedCushionShape(caseWidth * 0.76, caseCornerRadius * 0.68);
  const dialGeometry = new THREE.ExtrudeGeometry(dialShape, { depth: 0.001, bevelEnabled: false });
  dialGeometry.center();
  const dialMesh = new THREE.Mesh(dialGeometry, dialMaterial);
  dialMesh.position.z = caseThickness / 2 + 0.0005;
  dialMesh.name = 'Watch_Dial';
  watchGroup.add(dialMesh);

  // 4. ROMAN NUMERAL MARKERS & HOUR TICKS
  const dialRadius = caseWidth * 0.32;
  const markerAngles = [
    { label: 'XII', angle: Math.PI / 2 },
    { label: 'I', angle: Math.PI / 3 },
    { label: 'II', angle: Math.PI / 6 },
    { label: 'III', angle: 0 },
    { label: 'IV', angle: -Math.PI / 6 },
    { label: 'V', angle: -Math.PI / 3 },
    { label: 'VI', angle: -Math.PI / 2 },
    { label: 'VII', angle: -2 * Math.PI / 3 },
    { label: 'VIII', angle: -5 * Math.PI / 6 },
    { label: 'IX', angle: Math.PI },
    { label: 'X', angle: 5 * Math.PI / 6 },
    { label: 'XI', angle: 2 * Math.PI / 3 }
  ];

  const markersGroup = new THREE.Group();
  markersGroup.name = 'Dial_Markers';

  markerAngles.forEach((m) => {
    const isQuarter = (m.label === 'XII' || m.label === 'III' || m.label === 'VI' || m.label === 'IX');
    const tickWidth = isQuarter ? 0.0014 : 0.0009;
    const tickHeight = isQuarter ? 0.0035 : 0.0022;
    const tickGeo = new THREE.BoxGeometry(tickWidth, tickHeight, 0.0005);
    const tickMesh = new THREE.Mesh(tickGeo, darkRomanMaterial);

    const x = Math.cos(m.angle) * dialRadius;
    const y = Math.sin(m.angle) * dialRadius;
    tickMesh.position.set(x, y, caseThickness / 2 + 0.0015);
    tickMesh.rotation.z = m.angle - Math.PI / 2;
    markersGroup.add(tickMesh);
  });
  watchGroup.add(markersGroup);

  // 5. HANDS & CENTER PIN
  const handsGroup = new THREE.Group();
  handsGroup.name = 'Watch_Hands';

  // Center Cap Pin
  const pinGeo = new THREE.CylinderGeometry(0.001, 0.001, 0.002, 16);
  pinGeo.rotateX(Math.PI / 2);
  const pinMesh = new THREE.Mesh(pinGeo, roseGoldAccentMaterial);
  pinMesh.position.z = caseThickness / 2 + 0.002;
  handsGroup.add(pinMesh);

  // Hour Hand (Pointing ~10:10)
  const hourHandGeo = new THREE.BoxGeometry(0.0009, 0.010, 0.0004);
  hourHandGeo.translate(0, 0.005, 0);
  const hourHandMesh = new THREE.Mesh(hourHandGeo, roseGoldAccentMaterial);
  hourHandMesh.position.z = caseThickness / 2 + 0.0022;
  hourHandMesh.rotation.z = Math.PI * 0.65; // ~10 o'clock
  handsGroup.add(hourHandMesh);

  // Minute Hand (Pointing ~10:10)
  const minHandGeo = new THREE.BoxGeometry(0.0007, 0.014, 0.0004);
  minHandGeo.translate(0, 0.007, 0);
  const minHandMesh = new THREE.Mesh(minHandGeo, roseGoldAccentMaterial);
  minHandMesh.position.z = caseThickness / 2 + 0.0026;
  minHandMesh.rotation.z = -Math.PI * 0.15; // ~2 o'clock
  handsGroup.add(minHandMesh);

  // Second Hand (Thin Needle)
  const secHandGeo = new THREE.BoxGeometry(0.0003, 0.016, 0.0003);
  secHandGeo.translate(0, 0.008, 0);
  const secHandMesh = new THREE.Mesh(secHandGeo, darkRomanMaterial);
  secHandMesh.position.z = caseThickness / 2 + 0.0030;
  secHandMesh.rotation.z = -Math.PI * 0.65;
  handsGroup.add(secHandMesh);

  watchGroup.add(handsGroup);

  // 6. SAPPHIRE GLASS COVER
  const glassShape = createRoundedCushionShape(caseWidth * 0.85, caseCornerRadius * 0.8);
  const glassGeometry = new THREE.ExtrudeGeometry(glassShape, { depth: 0.0008, bevelEnabled: true, bevelSize: 0.0003, bevelThickness: 0.0003 });
  glassGeometry.center();
  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  glassMesh.position.z = caseThickness / 2 + 0.0032;
  glassMesh.name = 'Sapphire_Glass';
  watchGroup.add(glassMesh);

  // 7. WINDING CROWN (3 o'clock position)
  const crownGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.0035, 16);
  crownGeo.rotateZ(Math.PI / 2);
  const crownMesh = new THREE.Mesh(crownGeo, roseGoldAccentMaterial);
  crownMesh.position.set(caseWidth / 2 + 0.002, 0, 0);
  crownMesh.name = 'Winding_Crown';
  watchGroup.add(crownMesh);

  // 8. LUGS (Top and Bottom)
  const lugGeo = new THREE.BoxGeometry(0.004, 0.008, 0.006);
  const lugOffset = caseWidth * 0.35;
  const lugY = caseWidth / 2 + 0.003;

  [[-lugOffset, lugY], [lugOffset, lugY], [-lugOffset, -lugY], [lugOffset, -lugY]].forEach(([lx, ly], idx) => {
    const lugMesh = new THREE.Mesh(lugGeo, roseGoldMaterial);
    lugMesh.position.set(lx, ly, 0);
    lugMesh.name = `Lug_${idx + 1}`;
    watchGroup.add(lugMesh);
  });

  // 9. CURVED METALLIC LINK BRACELET
  const braceletGroup = new THREE.Group();
  braceletGroup.name = 'RoseGold_Bracelet';

  const radiusY = 0.045; // Elliptical loop Y radius
  const radiusZ = 0.028; // Elliptical loop Z radius
  const linkCount = 42;
  const linkWidth = 0.018; // 18mm band width

  for (let i = 0; i < linkCount; i++) {
    const theta = (i / linkCount) * Math.PI * 2;
    
    // Skip segment where watch case is mounted at top
    if (Math.abs(theta - Math.PI / 2) < 0.25) continue;

    const y = Math.sin(theta) * radiusY;
    const z = Math.cos(theta) * radiusZ - radiusZ;

    // Center link block
    const centerLinkGeo = new THREE.BoxGeometry(linkWidth * 0.45, 0.0025, 0.0045);
    const centerLinkMesh = new THREE.Mesh(centerLinkGeo, roseGoldAccentMaterial);

    // Outer link blocks
    const outerLinkGeo = new THREE.BoxGeometry(linkWidth * 0.25, 0.0022, 0.0042);
    const leftOuter = new THREE.Mesh(outerLinkGeo, roseGoldMaterial);
    const rightOuter = new THREE.Mesh(outerLinkGeo, roseGoldMaterial);

    leftOuter.position.x = -linkWidth * 0.35;
    rightOuter.position.x = linkWidth * 0.35;

    const linkSegment = new THREE.Group();
    linkSegment.add(centerLinkMesh);
    linkSegment.add(leftOuter);
    linkSegment.add(rightOuter);

    linkSegment.position.set(0, y, z);
    linkSegment.rotation.x = -theta + Math.PI / 2;

    braceletGroup.add(linkSegment);
  }
  watchGroup.add(braceletGroup);

  // 10. LUXURY DISPLAY CUSHION PILLOW
  const pillowGeo = new THREE.CylinderGeometry(radiusY * 0.85, radiusY * 0.85, linkWidth * 1.8, 32);
  pillowGeo.rotateZ(Math.PI / 2);
  const pillowMesh = new THREE.Mesh(pillowGeo, cushionPillowMaterial);
  pillowMesh.position.set(0, 0, -radiusZ);
  pillowMesh.name = 'Display_Pillow';
  watchGroup.add(pillowMesh);

  return watchGroup;
}

async function exportWatchGLB(filename) {
  const watchGroup = buildRoseGoldWatchGroup();
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      watchGroup,
      (result) => {
        try {
          const modelsDir = path.join(__dirname, '../public/models');
          if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
          }
          const filePath = path.join(modelsDir, filename);
          fs.writeFileSync(filePath, Buffer.from(result));
          console.log(`✅ Successfully generated 3D GLB watch model: ${filePath} (${result.byteLength} bytes)`);
          resolve(filePath);
        } catch (err) {
          reject(err);
        }
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

async function main() {
  console.log('⌚ Generating 3D GLB Rose Gold Cushion Watch model...');
  await exportWatchGLB('rose-gold-square-watch.glb');
  await exportWatchGLB('chrono-luxe-rose-gold.glb');
  await exportWatchGLB('watch-rose-gold.glb');
  console.log('🎉 All watch 3D models generated successfully!');
}

main().catch(console.error);
