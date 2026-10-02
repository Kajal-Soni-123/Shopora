const THREE = require('three');
const fs = require('fs');
const path = require('path');

// Helper to pack glTF JSON and binary data into a valid .glb file
function createGLBBuffer(gltfDoc, binaryBuffer) {
  const jsonString = JSON.stringify(gltfDoc);
  let jsonBuffer = Buffer.from(jsonString, 'utf-8');
  
  // Pad JSON buffer to 4-byte boundary with trailing spaces (0x20)
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0) {
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
  }

  // Pad Binary buffer to 4-byte boundary with trailing nulls (0x00)
  let binBuffer = binaryBuffer || Buffer.alloc(0);
  const binPadding = (4 - (binBuffer.length % 4)) % 4;
  if (binPadding > 0) {
    binBuffer = Buffer.concat([binBuffer, Buffer.alloc(binPadding, 0x00)]);
  }

  const chunk0Length = jsonBuffer.length;
  const chunk1Length = binBuffer.length;
  const totalLength = 12 + (8 + chunk0Length) + (chunk1Length > 0 ? (8 + chunk1Length) : 0);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // magic 'glTF'
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLength, 8);// total file length

  const chunk0Header = Buffer.alloc(8);
  chunk0Header.writeUInt32LE(chunk0Length, 0);
  chunk0Header.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

  const buffers = [header, chunk0Header, jsonBuffer];

  if (chunk1Length > 0) {
    const chunk1Header = Buffer.alloc(8);
    chunk1Header.writeUInt32LE(chunk1Length, 0);
    chunk1Header.writeUInt32LE(0x00415441, 4); // 'BIN\0'
    buffers.push(chunk1Header, binBuffer);
  }

  return Buffer.concat(buffers);
}

// Convert a Three.js Group into a standalone GLB Buffer directly
function exportGroupToGLB(group) {
  const positions = [];
  const normals = [];
  const indices = [];

  group.updateMatrixWorld(true);

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);

      // Ensure geometry has normals
      if (!geom.attributes.normal) {
        geom.computeVertexNormals();
      }

      const posAttr = geom.attributes.position;
      const normAttr = geom.attributes.normal;
      const indexAttr = geom.index;

      const vertexOffset = positions.length / 3;

      for (let i = 0; i < posAttr.count; i++) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      }

      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i++) {
          indices.push(indexAttr.getX(i) + vertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          indices.push(i + vertexOffset);
        }
      }
    }
  });

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i+1], z = positions[i+2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  // Pack binary data
  const posBuffer = Buffer.alloc(positions.length * 4);
  positions.forEach((val, idx) => posBuffer.writeFloatLE(val, idx * 4));

  const normBuffer = Buffer.alloc(normals.length * 4);
  normals.forEach((val, idx) => normBuffer.writeFloatLE(val, idx * 4));

  // Determine index component type (uint16 or uint32)
  const isUint32 = indices.length > 65535 || (positions.length / 3) > 65535;
  const idxBuffer = Buffer.alloc(indices.length * (isUint32 ? 4 : 2));
  indices.forEach((val, idx) => {
    if (isUint32) {
      idxBuffer.writeUInt32LE(val, idx * 4);
    } else {
      idxBuffer.writeUInt16LE(val, idx * 2);
    }
  });

  const posByteOffset = 0;
  const posByteLength = posBuffer.length;

  const normByteOffset = posByteLength;
  const normByteLength = normBuffer.length;

  const idxByteOffset = normByteOffset + normByteLength;
  const idxByteLength = idxBuffer.length;

  const binBuffer = Buffer.concat([posBuffer, normBuffer, idxBuffer]);

  const gltfDoc = {
    asset: { version: "2.0", generator: "Shopora Mannequin GLB Generator" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: group.name || "Mannequin" }],
    meshes: [{
      name: "MannequinMesh",
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        material: 0
      }]
    }],
    materials: [{
      name: "MannequinMaterial",
      pbrMetallicRoughness: {
        baseColorFactor: [0.918, 0.843, 0.765, 1.0], // #ead7c3
        roughnessFactor: 0.55,
        metallicFactor: 0.02
      }
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: positions.length / 3,
        type: "VEC3",
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      },
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        count: normals.length / 3,
        type: "VEC3"
      },
      {
        bufferView: 2,
        componentType: isUint32 ? 5125 : 5123, // UNSIGNED_INT or UNSIGNED_SHORT
        count: indices.length,
        type: "SCALAR",
        min: [0],
        max: [indices.length > 0 ? Math.max(...indices) : 0]
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posByteOffset, byteLength: posByteLength, target: 34962 },
      { buffer: 0, byteOffset: normByteOffset, byteLength: normByteLength, target: 34962 },
      { buffer: 0, byteOffset: idxByteOffset, byteLength: idxByteLength, target: 34963 }
    ],
    buffers: [{ byteLength: binBuffer.length }]
  };

  return createGLBBuffer(gltfDoc, binBuffer);
}

// Build Smooth Realistic Anatomical Mannequins
const { buildMannequinGroup } = require('./build_mannequin_group.js');

function generateAllGLBs() {
  const modelsDir = path.join(__dirname, '../public/models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const targets = [
    { cat: 'men', file: 'mannequin-male.glb' },
    { cat: 'men', file: 'mannequin-men.glb' },
    { cat: 'women', file: 'mannequin-female.glb' },
    { cat: 'women', file: 'mannequin-women.glb' },
    { cat: 'children', file: 'mannequin-child.glb' },
    { cat: 'children', file: 'mannequin-children.glb' }
  ];

  targets.forEach(({ cat, file }) => {
    const group = buildMannequinGroup(cat);
    const glbBuffer = exportGroupToGLB(group);
    const filePath = path.join(modelsDir, file);
    fs.writeFileSync(filePath, glbBuffer);
    console.log(`✅ Created valid binary GLB model (${cat}): ${filePath} (${glbBuffer.length} bytes / ${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  });
}

generateAllGLBs();
