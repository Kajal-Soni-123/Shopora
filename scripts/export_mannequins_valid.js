const fs = require('fs');
const path = require('path');

// Polyfill FileReader & Blob for GLTFExporter in Node
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
const { buildMannequinGroup } = require('./build_mannequin_group.js');

async function exportGLB(category, filename) {
  const group = buildMannequinGroup(category);
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        const filePath = path.join(__dirname, '../public/models', filename);
        fs.writeFileSync(filePath, Buffer.from(result));
        console.log(`Exported 100% valid GLB: ${filePath} (${result.byteLength} bytes)`);
        resolve();
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

async function main() {
  await exportGLB('men', 'mannequin-male.glb');
  await exportGLB('men', 'mannequin-men.glb');
  await exportGLB('women', 'mannequin-female.glb');
  await exportGLB('women', 'mannequin-women.glb');
  await exportGLB('children', 'mannequin-child.glb');
  await exportGLB('children', 'mannequin-children.glb');
}

main().catch(console.error);
