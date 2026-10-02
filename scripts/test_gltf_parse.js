const fs = require('fs');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

const buf = fs.readFileSync('public/models/mannequin-male.glb');
const ab = new ArrayBuffer(buf.length);
new Uint8Array(ab).set(buf);

const loader = new GLTFLoader();
loader.parse(
  ab,
  '',
  (gltf) => {
    console.log('🎉 SUCCESS! BINARY GLB PARSED PERFECTLY IN THREE.JS!');
    console.log('Scene children count:', gltf.scene.children.length);
  },
  (err) => {
    console.error('❌ ERROR PARSING GLB:', err);
  }
);
