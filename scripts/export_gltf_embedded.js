const fs = require('fs');
const path = require('path');

// Robust FileReader polyfill for Node.js
global.FileReader = class FileReader {
  readAsDataURL(blob) {
    process.nextTick(() => {
      const base64 = blob.buffer.toString('base64');
      this.result = `data:application/octet-stream;base64,${base64}`;
      if (this.onload) this.onload({ target: this });
    });
  }
};

global.Blob = class Blob {
  constructor(buffers) {
    this.buffer = Buffer.concat(buffers.map(b => Buffer.from(b)));
  }
};

const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');
const { buildMannequinGroup } = require('./build_mannequin_group.js');

function exportEmbeddedGLTF(category, filenameGLTF, filenameGLB) {
  return new Promise((resolve, reject) => {
    const group = buildMannequinGroup(category);
    const exporter = new GLTFExporter();

    exporter.parse(
      group,
      (gltfJson) => {
        try {
          const jsonStr = JSON.stringify(gltfJson);
          const modelsDir = path.join(__dirname, '../public/models');
          
          const gltfPath = path.join(modelsDir, filenameGLTF);
          fs.writeFileSync(gltfPath, jsonStr);

          const glbPath = path.join(modelsDir, filenameGLB);
          fs.writeFileSync(glbPath, jsonStr);
          console.log(`✅ Exported glTF data-URI mannequin: ${gltfPath} (${jsonStr.length} bytes)`);
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      (err) => reject(err),
      { binary: false }
    );
  });
}

async function main() {
  const modelsDir = path.join(__dirname, '../public/models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  await exportEmbeddedGLTF('men', 'mannequin-men.gltf', 'mannequin-male.glb');
  await exportEmbeddedGLTF('men', 'mannequin-male.gltf', 'mannequin-men.glb');
  await exportEmbeddedGLTF('women', 'mannequin-women.gltf', 'mannequin-female.glb');
  await exportEmbeddedGLTF('women', 'mannequin-female.gltf', 'mannequin-women.glb');
  await exportEmbeddedGLTF('children', 'mannequin-children.gltf', 'mannequin-child.glb');
  await exportEmbeddedGLTF('children', 'mannequin-child.gltf', 'mannequin-children.glb');
}

main().catch(console.error);
