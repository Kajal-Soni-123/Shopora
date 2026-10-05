const fs = require('fs');
const path = require('path');

// Polyfill FileReader & Blob for GLTFExporter in Node.js environment
global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    this.result = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
    if (this.onload) {
      this.onload({ target: this });
    }
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

function buildFossilWatchGroup() {
  const watchGroup = new THREE.Group();
  watchGroup.name = 'Fossil_BlueDial_LeatherWatch';

  // -------------------------------------------------------------
  // MATERIALS & COLOR PALETTE
  // -------------------------------------------------------------

  // Polished Silver Stainless Steel Case & Lugs
  const silverCaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xD8DEE4,
    metalness: 0.96,
    roughness: 0.12,
    name: 'Silver_Polished_Steel'
  });

  // Shiny Chrome Bezel
  const chromeBezelMaterial = new THREE.MeshStandardMaterial({
    color: 0xEAEFF4,
    metalness: 0.98,
    roughness: 0.08,
    name: 'Chrome_Bezel'
  });

  // Brushed Steel Caseback
  const steelBackMaterial = new THREE.MeshStandardMaterial({
    color: 0xC0C6CC,
    metalness: 0.90,
    roughness: 0.30,
    name: 'Steel_Brushed_Back'
  });

  // Deep Navy Blue Dial Face
  const dialMaterial = new THREE.MeshStandardMaterial({
    color: 0x1B365D,
    metalness: 0.10,
    roughness: 0.38,
    name: 'Dial_NavyBlue'
  });

  // White Ink Markings & Indices
  const whiteInkMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    name: 'White_Ink_Markings'
  });

  const whiteMutedInkMaterial = new THREE.MeshBasicMaterial({
    color: 0xCFD8E3,
    name: 'White_Muted_Ink'
  });

  // Rose Gold Hour Markers & Hands
  const roseGoldMaterial = new THREE.MeshStandardMaterial({
    color: 0xD4A373,
    metalness: 0.92,
    roughness: 0.18,
    name: 'RoseGold_Polished'
  });

  // Luminous White Fill for Hands
  const lumeMaterial = new THREE.MeshStandardMaterial({
    color: 0xF5F7FA,
    metalness: 0.10,
    roughness: 0.20,
    name: 'Lume_White_Fill'
  });

  // Cognac Brown Leather Strap
  const leatherStrapMaterial = new THREE.MeshStandardMaterial({
    color: 0x7E3B0E,
    roughness: 0.68,
    metalness: 0.05,
    name: 'Cognac_Brown_Leather'
  });

  // Dark Burnished Edge Material
  const leatherEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4A2006,
    roughness: 0.75,
    metalness: 0.05,
    name: 'Leather_Burnished_Edge'
  });

  // Cream Thread Stitching Material
  const stitchMaterial = new THREE.MeshStandardMaterial({
    color: 0xE6C280,
    roughness: 0.60,
    metalness: 0.08,
    name: 'Cream_Thread_Stitching'
  });

  // Sapphire Glass Cover
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    transmission: 0.95,
    ior: 1.5,
    name: 'Sapphire_Glass'
  });

  // -------------------------------------------------------------
  // 1. WATCH CASE (Round Silver Body)
  // -------------------------------------------------------------
  const caseRadius = 0.020; // 40mm diameter
  const caseHeight = 0.0075; // 7.5mm thickness

  const caseGeo = new THREE.CylinderGeometry(caseRadius, caseRadius * 0.98, caseHeight, 64);
  caseGeo.rotateX(Math.PI / 2); // Orient front towards +Z
  const caseMesh = new THREE.Mesh(caseGeo, silverCaseMaterial);
  caseMesh.name = 'Watch_Case_Body';
  watchGroup.add(caseMesh);

  // Case Back Plate
  const caseBackGeo = new THREE.CylinderGeometry(caseRadius * 0.92, caseRadius * 0.92, 0.001, 48);
  caseBackGeo.rotateX(Math.PI / 2);
  const caseBackMesh = new THREE.Mesh(caseBackGeo, steelBackMaterial);
  caseBackMesh.position.z = -caseHeight / 2 - 0.0005;
  caseBackMesh.name = 'Watch_Caseback';
  watchGroup.add(caseBackMesh);

  // -------------------------------------------------------------
  // 2. BEZEL (Polished Silver Outer Frame)
  // -------------------------------------------------------------
  const bezelShape = new THREE.Shape();
  bezelShape.absarc(0, 0, caseRadius, 0, Math.PI * 2, false);
  const bezelHole = new THREE.Path();
  bezelHole.absarc(0, 0, caseRadius * 0.88, 0, Math.PI * 2, true);
  bezelShape.holes.push(bezelHole);

  const bezelExtrudeSettings = {
    depth: 0.0018,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.0004,
    bevelThickness: 0.0004
  };

  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, bezelExtrudeSettings);
  bezelGeo.center();
  const bezelMesh = new THREE.Mesh(bezelGeo, chromeBezelMaterial);
  bezelMesh.position.z = caseHeight / 2 + 0.0009;
  bezelMesh.name = 'Watch_Bezel';
  watchGroup.add(bezelMesh);

  // -------------------------------------------------------------
  // 3. DIAL FACE (Deep Navy Blue)
  // -------------------------------------------------------------
  const dialRadius = caseRadius * 0.87;
  const dialGeo = new THREE.CylinderGeometry(dialRadius, dialRadius, 0.001, 64);
  dialGeo.rotateX(Math.PI / 2);
  const dialMesh = new THREE.Mesh(dialGeo, dialMaterial);
  dialMesh.position.z = caseHeight / 2 + 0.0005;
  dialMesh.name = 'Watch_Dial_NavyBlue';
  watchGroup.add(dialMesh);

  // -------------------------------------------------------------
  // 4. OUTER MINUTE TRACK & INDEX TICKS (60 Minute Ticks & Numbers)
  // -------------------------------------------------------------
  const dialMarkingsGroup = new THREE.Group();
  dialMarkingsGroup.name = 'Dial_Markings_Track';

  const trackRadius = dialRadius * 0.90;

  // Outer Ring Line
  const ringGeo = new THREE.RingGeometry(trackRadius * 0.99, trackRadius * 1.005, 64);
  const ringMesh = new THREE.Mesh(ringGeo, whiteMutedInkMaterial);
  ringMesh.position.z = caseHeight / 2 + 0.0011;
  dialMarkingsGroup.add(ringMesh);

  // 60 Ticks around dial
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const isFiveMinute = (i % 5 === 0);
    const tickWidth = isFiveMinute ? 0.0004 : 0.0002;
    const tickLength = isFiveMinute ? 0.0012 : 0.0007;

    const tickGeo = new THREE.PlaneGeometry(tickWidth, tickLength);
    const tickMesh = new THREE.Mesh(tickGeo, isFiveMinute ? whiteInkMaterial : whiteMutedInkMaterial);

    const rPos = trackRadius - tickLength / 2;
    tickMesh.position.x = Math.sin(angle) * rPos;
    tickMesh.position.y = Math.cos(angle) * rPos;
    tickMesh.position.z = caseHeight / 2 + 0.0012;
    tickMesh.rotation.z = -angle;

    dialMarkingsGroup.add(tickMesh);
  }

  // 5-Minute Radial Text/Number Blocks (05, 10, 15, ..., 60)
  for (let i = 1; i <= 12; i++) {
    const minuteVal = i * 5;
    const angle = (i / 12) * Math.PI * 2;
    const rPos = trackRadius - 0.0022;

    // Small printed digit geometry block
    const numGeo = new THREE.BoxGeometry(0.0008, 0.0006, 0.0001);
    const numMesh = new THREE.Mesh(numGeo, whiteInkMaterial);

    numMesh.position.x = Math.sin(angle) * rPos;
    numMesh.position.y = Math.cos(angle) * rPos;
    numMesh.position.z = caseHeight / 2 + 0.0012;
    numMesh.rotation.z = -angle;

    dialMarkingsGroup.add(numMesh);
  }

  // "FOSSIL" Brand Text Block (Below 12 o'clock)
  const brandGeo = new THREE.BoxGeometry(0.0042, 0.0011, 0.0001);
  const brandMesh = new THREE.Mesh(brandGeo, whiteInkMaterial);
  brandMesh.position.set(0, dialRadius * 0.42, caseHeight / 2 + 0.0012);
  brandMesh.name = 'Fossil_Brand_Logo';
  dialMarkingsGroup.add(brandMesh);

  // "JAPAN MOVT" Text Block (Above 6 o'clock)
  const movtGeo = new THREE.BoxGeometry(0.0035, 0.0005, 0.0001);
  const movtMesh = new THREE.Mesh(movtGeo, whiteMutedInkMaterial);
  movtMesh.position.set(0, -dialRadius * 0.82, caseHeight / 2 + 0.0012);
  movtMesh.name = 'Japan_Movt_Text';
  dialMarkingsGroup.add(movtMesh);

  watchGroup.add(dialMarkingsGroup);

  // -------------------------------------------------------------
  // 5. APPLIED ROSE GOLD HOUR MARKERS (Double stick at 12)
  // -------------------------------------------------------------
  const hourMarkersGroup = new THREE.Group();
  hourMarkersGroup.name = 'RoseGold_Hour_Markers';

  const markerRadius = dialRadius * 0.72;
  const markerLength = 0.0032;
  const markerWidth = 0.0008;
  const markerThickness = 0.0005;

  for (let hour = 1; hour <= 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2;

    if (hour === 12) {
      // Double Stick Marker at 12 o'clock
      const offset = 0.0006;
      [-offset, offset].forEach((dx) => {
        const mGeo = new THREE.BoxGeometry(markerWidth, markerLength, markerThickness);
        const mMesh = new THREE.Mesh(mGeo, roseGoldMaterial);

        mMesh.position.x = dx;
        mMesh.position.y = markerRadius;
        mMesh.position.z = caseHeight / 2 + 0.0015;
        hourMarkersGroup.add(mMesh);
      });
    } else {
      // Single Stick Marker
      const mGeo = new THREE.BoxGeometry(markerWidth, markerLength, markerThickness);
      const mMesh = new THREE.Mesh(mGeo, roseGoldMaterial);

      const mx = Math.sin(angle) * markerRadius;
      const my = Math.cos(angle) * markerRadius;
      mMesh.position.set(mx, my, caseHeight / 2 + 0.0015);
      mMesh.rotation.z = -angle;
      hourMarkersGroup.add(mMesh);
    }
  }
  watchGroup.add(hourMarkersGroup);

  // -------------------------------------------------------------
  // 6. HANDS & CENTER PIN (Rose Gold + Luminous Fill)
  // -------------------------------------------------------------
  const handsGroup = new THREE.Group();
  handsGroup.name = 'Watch_Hands';

  // Center Pin Cap
  const pinGeo = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0015, 24);
  pinGeo.rotateX(Math.PI / 2);
  const pinMesh = new THREE.Mesh(pinGeo, roseGoldMaterial);
  pinMesh.position.z = caseHeight / 2 + 0.0022;
  handsGroup.add(pinMesh);

  // --- Hour Hand (Skeletonized Tapered Stick, ~10:08 position) ---
  const hourHandGroup = new THREE.Group();
  hourHandGroup.name = 'Hour_Hand';

  const hFrameGeo = new THREE.BoxGeometry(0.0011, 0.009, 0.0004);
  hFrameGeo.translate(0, 0.0045, 0);
  const hFrameMesh = new THREE.Mesh(hFrameGeo, roseGoldMaterial);

  const hLumeGeo = new THREE.BoxGeometry(0.0006, 0.006, 0.0003);
  hLumeGeo.translate(0, 0.0045, 0);
  const hLumeMesh = new THREE.Mesh(hLumeGeo, lumeMaterial);
  hLumeMesh.position.z = 0.0001;

  hourHandGroup.add(hFrameMesh);
  hourHandGroup.add(hLumeMesh);

  const hourAngle = (10.14 / 12) * Math.PI * 2; // ~10 o'clock
  hourHandGroup.position.z = caseHeight / 2 + 0.0024;
  hourHandGroup.rotation.z = -hourAngle;
  handsGroup.add(hourHandGroup);

  // --- Minute Hand (Skeletonized Tapered Stick, ~2:10 position) ---
  const minHandGroup = new THREE.Group();
  minHandGroup.name = 'Minute_Hand';

  const mFrameGeo = new THREE.BoxGeometry(0.0009, 0.0135, 0.0004);
  mFrameGeo.translate(0, 0.0067, 0);
  const mFrameMesh = new THREE.Mesh(mFrameGeo, roseGoldMaterial);

  const mLumeGeo = new THREE.BoxGeometry(0.0005, 0.009, 0.0003);
  mLumeGeo.translate(0, 0.0067, 0);
  const mLumeMesh = new THREE.Mesh(mLumeGeo, lumeMaterial);
  mLumeMesh.position.z = 0.0001;

  minHandGroup.add(mFrameMesh);
  minHandGroup.add(mLumeMesh);

  const minAngle = (2.16 / 12) * Math.PI * 2; // ~2 o'clock
  minHandGroup.position.z = caseHeight / 2 + 0.0028;
  minHandGroup.rotation.z = -minAngle;
  handsGroup.add(minHandGroup);

  // --- Second Hand (Thin Needle with Circular Counterweight) ---
  const secHandGroup = new THREE.Group();
  secHandGroup.name = 'Second_Hand';

  const sNeedleGeo = new THREE.BoxGeometry(0.0003, 0.015, 0.0003);
  sNeedleGeo.translate(0, 0.005, 0);
  const sNeedleMesh = new THREE.Mesh(sNeedleGeo, roseGoldMaterial);

  const sCounterGeo = new THREE.CylinderGeometry(0.0008, 0.0008, 0.0003, 16);
  sCounterGeo.rotateX(Math.PI / 2);
  sCounterGeo.translate(0, -0.0025, 0);
  const sCounterMesh = new THREE.Mesh(sCounterGeo, roseGoldMaterial);

  secHandGroup.add(sNeedleMesh);
  secHandGroup.add(sCounterMesh);

  const secAngle = (7.35 / 12) * Math.PI * 2; // ~7 o'clock
  secHandGroup.position.z = caseHeight / 2 + 0.0032;
  secHandGroup.rotation.z = -secAngle;
  handsGroup.add(secHandGroup);

  watchGroup.add(handsGroup);

  // -------------------------------------------------------------
  // 7. SAPPHIRE GLASS LENS COVER
  // -------------------------------------------------------------
  const glassGeo = new THREE.CylinderGeometry(dialRadius * 1.01, dialRadius * 1.01, 0.001, 64);
  glassGeo.rotateX(Math.PI / 2);
  const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.z = caseHeight / 2 + 0.0035;
  glassMesh.name = 'Sapphire_Glass_Lens';
  watchGroup.add(glassMesh);

  // -------------------------------------------------------------
  // 8. WINDING CROWN & LUGS (Polished Silver Details)
  // -------------------------------------------------------------

  // Ridged Winding Crown (3 o'clock position)
  const crownGroup = new THREE.Group();
  crownGroup.name = 'Winding_Crown';

  const crownBaseGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0025, 24);
  crownBaseGeo.rotateZ(Math.PI / 2);
  const crownBaseMesh = new THREE.Mesh(crownBaseGeo, silverCaseMaterial);
  crownGroup.add(crownBaseMesh);

  const crownCapGeo = new THREE.CylinderGeometry(0.0020, 0.0018, 0.0012, 24);
  crownCapGeo.rotateZ(Math.PI / 2);
  const crownCapMesh = new THREE.Mesh(crownCapGeo, chromeBezelMaterial);
  crownCapMesh.position.x = 0.0012;
  crownGroup.add(crownCapMesh);

  crownGroup.position.set(caseRadius + 0.0012, 0, 0);
  watchGroup.add(crownGroup);

  // 4 Tapered Lugs (Silver Stainless Steel)
  const lugWidth = 0.0038;
  const lugLength = 0.0085;
  const lugDepth = 0.0060;
  const lugOffsetX = caseRadius * 0.65;
  const lugOffsetY = caseRadius * 0.90;

  const lugPositions = [
    [-lugOffsetX, lugOffsetY, 'Lug_Top_Left'],
    [lugOffsetX, lugOffsetY, 'Lug_Top_Right'],
    [-lugOffsetX, -lugOffsetY, 'Lug_Bottom_Left'],
    [lugOffsetX, -lugOffsetY, 'Lug_Bottom_Right']
  ];

  lugPositions.forEach(([lx, ly, lugName]) => {
    const lugGeo = new THREE.BoxGeometry(lugWidth, lugLength, lugDepth);
    const lugMesh = new THREE.Mesh(lugGeo, silverCaseMaterial);
    lugMesh.position.set(lx, ly > 0 ? ly + lugLength / 4 : ly - lugLength / 4, -0.001);
    lugMesh.name = lugName;
    watchGroup.add(lugMesh);
  });

  // -------------------------------------------------------------
  // 9. COGNAC BROWN LEATHER STRAPS WITH CREAM STITCHING
  // -------------------------------------------------------------
  const strapGroup = new THREE.Group();
  strapGroup.name = 'Leather_Straps';

  const strapWidth = 0.020; // 20mm band
  const strapLength = 0.075; // 75mm strap sections
  const strapThickness = 0.0030; // 3mm padded leather

  // Helper function to create stitched leather strap piece
  function createStitchedStrap(length, isTop) {
    const strapPiece = new THREE.Group();

    // Main Leather Body (Padded)
    const strapShape = new THREE.Shape();
    const halfW = strapWidth / 2;
    strapShape.moveTo(-halfW, 0);
    strapShape.lineTo(halfW, 0);
    strapShape.lineTo(halfW * 0.95, length);
    strapShape.lineTo(-halfW * 0.95, length);
    strapShape.closePath();

    const strapExtrudeSettings = {
      depth: strapThickness,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.0006,
      bevelThickness: 0.0006
    };

    const sGeo = new THREE.ExtrudeGeometry(strapShape, strapExtrudeSettings);
    sGeo.center();
    const sMesh = new THREE.Mesh(sGeo, leatherStrapMaterial);
    strapPiece.add(sMesh);

    // Burnished Dark Leather Edges (Left & Right border strips)
    [-halfW * 0.96, halfW * 0.96].forEach((edgeX) => {
      const edgeGeo = new THREE.BoxGeometry(0.0008, length, strapThickness * 1.02);
      const edgeMesh = new THREE.Mesh(edgeGeo, leatherEdgeMaterial);
      edgeMesh.position.set(edgeX, 0, 0);
      strapPiece.add(edgeMesh);
    });

    // Cream Thread Stitching Rows (Left & Right Stitch Lines)
    const stitchCount = 28;
    const stitchStep = (length * 0.92) / stitchCount;
    const stitchX = halfW * 0.78;

    for (let s = 0; s < stitchCount; s++) {
      const sy = -length / 2 + 0.004 + s * stitchStep;
      [-stitchX, stitchX].forEach((sx) => {
        const stitchSegmentGeo = new THREE.BoxGeometry(0.0006, 0.0018, 0.0008);
        const stitchMesh = new THREE.Mesh(stitchSegmentGeo, stitchMaterial);
        stitchMesh.position.set(sx, sy, strapThickness / 2 + 0.0004);
        strapPiece.add(stitchMesh);
      });
    }

    return strapPiece;
  }

  // Upper Strap (+Y direction, angled/curved down in Z)
  const upperStrap = createStitchedStrap(strapLength, true);
  upperStrap.position.set(0, caseRadius + strapLength / 2 + 0.002, -strapThickness);
  upperStrap.rotation.x = -Math.PI * 0.06; // Subtle ergonomic curve
  upperStrap.name = 'Strap_Upper';
  strapGroup.add(upperStrap);

  // Strap Keeper Loop (Brown Leather Loop)
  const keeperGeo = new THREE.BoxGeometry(strapWidth * 1.10, 0.004, strapThickness * 1.40);
  const keeperMesh = new THREE.Mesh(keeperGeo, leatherStrapMaterial);
  keeperMesh.position.set(0, caseRadius + 0.025, -strapThickness + 0.001);
  strapGroup.add(keeperMesh);

  // Silver Strap Buckle at top end
  const buckleGroup = new THREE.Group();
  buckleGroup.name = 'Silver_Buckle';
  const buckleFrameGeo = new THREE.BoxGeometry(strapWidth * 1.12, 0.006, 0.004);
  const buckleFrameMesh = new THREE.Mesh(buckleFrameGeo, silverCaseMaterial);
  const bucklePinGeo = new THREE.BoxGeometry(0.0012, 0.008, 0.0015);
  const bucklePinMesh = new THREE.Mesh(bucklePinGeo, silverCaseMaterial);

  buckleGroup.add(buckleFrameMesh);
  buckleGroup.add(bucklePinMesh);
  buckleGroup.position.set(0, caseRadius + strapLength + 0.003, -strapThickness * 1.5);
  strapGroup.add(buckleGroup);

  // Lower Strap (-Y direction, angled/curved down in Z)
  const lowerStrap = createStitchedStrap(strapLength, false);
  lowerStrap.rotation.z = Math.PI; // Flip orientation
  lowerStrap.position.set(0, -caseRadius - strapLength / 2 - 0.002, -strapThickness);
  lowerStrap.rotation.x = Math.PI * 0.06;
  lowerStrap.name = 'Strap_Lower';
  strapGroup.add(lowerStrap);

  watchGroup.add(strapGroup);

  return watchGroup;
}

async function exportWatchGLB(filename) {
  const watchGroup = buildFossilWatchGroup();
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
          const sizeKb = (result.byteLength / 1024).toFixed(1);
          console.log(`✅ Successfully generated 3D GLB watch model: ${filePath} (${sizeKb} KB)`);
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
  console.log('⌚ Generating 3D GLB Fossil Blue Dial Leather Watch Model...');
  await exportWatchGLB('fossil-blue-leather-watch.glb');
  console.log('🎉 3D GLB model export completed successfully!');
}

main().catch(console.error);
