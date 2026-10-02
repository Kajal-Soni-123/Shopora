const THREE = require('three');

function createLatheBody(points, segments = 32) {
  const vec2Points = points.map(([x, y]) => new THREE.Vector2(x, y));
  const geom = new THREE.LatheGeometry(vec2Points, segments);
  geom.computeVertexNormals();
  return geom;
}

function createSphere(rx, ry, rz, widthSegs = 32, heightSegs = 32) {
  const geom = new THREE.SphereGeometry(1, widthSegs, heightSegs);
  geom.scale(rx, ry, rz);
  geom.computeVertexNormals();
  return geom;
}

function createCapsule(radius, length, capSub = 16, radSub = 32) {
  const geom = new THREE.CapsuleGeometry(radius, length, capSub, radSub);
  geom.computeVertexNormals();
  return geom;
}

function buildMannequinGroup(category) {
  const group = new THREE.Group();
  group.name = `StoreMannequin_${category}`;

  const mat = new THREE.MeshStandardMaterial({
    color: 0xe8d5c4,
    roughness: 0.6,
    metalness: 0.05,
  });

  if (category === 'men') {
    // Male Mannequin (Height ~1.75m, broader shoulders 0.44m, narrower hips 0.32m)
    const head = new THREE.Mesh(createSphere(0.10, 0.13, 0.11), mat);
    head.position.set(0, 1.62, 0);
    group.add(head);

    const neck = new THREE.Mesh(createCapsule(0.045, 0.08), mat);
    neck.position.set(0, 1.45, 0);
    group.add(neck);

    const torsoLathePoints = [
      [0.16, 0.95],
      [0.17, 1.05],
      [0.19, 1.15],
      [0.21, 1.25],
      [0.22, 1.35],
      [0.20, 1.38]
    ];
    const torso = new THREE.Mesh(createLatheBody(torsoLathePoints), mat);
    torso.scale.set(1.0, 1.0, 0.65);
    group.add(torso);

    const shoulders = new THREE.Mesh(createCapsule(0.065, 0.34), mat);
    shoulders.rotation.z = Math.PI / 2;
    shoulders.position.set(0, 1.36, 0);
    group.add(shoulders);

    const pelvis = new THREE.Mesh(createSphere(0.17, 0.12, 0.12), mat);
    pelvis.position.set(0, 0.90, 0);
    group.add(pelvis);

    const leftArm = new THREE.Mesh(createCapsule(0.042, 0.52), mat);
    leftArm.position.set(-0.24, 1.08, 0);
    leftArm.rotation.z = 0.12;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(createCapsule(0.042, 0.52), mat);
    rightArm.position.set(0.24, 1.08, 0);
    rightArm.rotation.z = -0.12;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(createCapsule(0.062, 0.82), mat);
    leftLeg.position.set(-0.11, 0.45, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(createCapsule(0.062, 0.82), mat);
    rightLeg.position.set(0.11, 0.45, 0);
    group.add(rightLeg);

    const leftFoot = new THREE.Mesh(createSphere(0.045, 0.035, 0.09), mat);
    leftFoot.position.set(-0.11, 0.04, 0.03);
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(createSphere(0.045, 0.035, 0.09), mat);
    rightFoot.position.set(0.11, 0.04, 0.03);
    group.add(rightFoot);

  } else if (category === 'women') {
    // Female Mannequin (Height ~1.72m, narrower shoulders 0.36m, bust 0.30m, slender waist 0.22m, hips 0.38m)
    const head = new THREE.Mesh(createSphere(0.095, 0.125, 0.105), mat);
    head.position.set(0, 1.60, 0);
    group.add(head);

    const neck = new THREE.Mesh(createCapsule(0.038, 0.08), mat);
    neck.position.set(0, 1.44, 0);
    group.add(neck);

    const femaleLathePoints = [
      [0.18, 0.88],
      [0.16, 0.98],
      [0.125, 1.10],
      [0.165, 1.22],
      [0.175, 1.32],
      [0.16, 1.36]
    ];
    const torso = new THREE.Mesh(createLatheBody(femaleLathePoints), mat);
    torso.scale.set(1.0, 1.0, 0.65);
    group.add(torso);

    const bust = new THREE.Mesh(createSphere(0.15, 0.09, 0.08), mat);
    bust.position.set(0, 1.23, 0.04);
    group.add(bust);

    const shoulders = new THREE.Mesh(createCapsule(0.05, 0.28), mat);
    shoulders.rotation.z = Math.PI / 2;
    shoulders.position.set(0, 1.34, 0);
    group.add(shoulders);

    const leftArm = new THREE.Mesh(createCapsule(0.036, 0.50), mat);
    leftArm.position.set(-0.20, 1.08, 0);
    leftArm.rotation.z = 0.14;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(createCapsule(0.036, 0.50), mat);
    rightArm.position.set(0.20, 1.08, 0);
    rightArm.rotation.z = -0.14;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(createCapsule(0.058, 0.82), mat);
    leftLeg.position.set(-0.105, 0.44, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(createCapsule(0.058, 0.82), mat);
    rightLeg.position.set(0.105, 0.44, 0);
    group.add(rightLeg);

    const leftFoot = new THREE.Mesh(createSphere(0.04, 0.03, 0.08), mat);
    leftFoot.position.set(-0.105, 0.03, 0.03);
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(createSphere(0.04, 0.03, 0.08), mat);
    rightFoot.position.set(0.105, 0.03, 0.03);
    group.add(rightFoot);

  } else {
    // Child Mannequin (Height ~1.15m, larger head-to-body ratio)
    const head = new THREE.Mesh(createSphere(0.11, 0.13, 0.11), mat);
    head.position.set(0, 1.15, 0);
    group.add(head);

    const neck = new THREE.Mesh(createCapsule(0.038, 0.06), mat);
    neck.position.set(0, 0.99, 0);
    group.add(neck);

    const childLathePoints = [
      [0.13, 0.52],
      [0.135, 0.65],
      [0.14, 0.78],
      [0.145, 0.88],
      [0.135, 0.93]
    ];
    const torso = new THREE.Mesh(createLatheBody(childLathePoints), mat);
    torso.scale.set(1.0, 1.0, 0.65);
    group.add(torso);

    const shoulders = new THREE.Mesh(createCapsule(0.042, 0.22), mat);
    shoulders.rotation.z = Math.PI / 2;
    shoulders.position.set(0, 0.92, 0);
    group.add(shoulders);

    const leftArm = new THREE.Mesh(createCapsule(0.030, 0.38), mat);
    leftArm.position.set(-0.15, 0.72, 0);
    leftArm.rotation.z = 0.10;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(createCapsule(0.030, 0.38), mat);
    rightArm.position.set(0.15, 0.72, 0);
    rightArm.rotation.z = -0.10;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(createCapsule(0.045, 0.48), mat);
    leftLeg.position.set(-0.08, 0.28, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(createCapsule(0.045, 0.48), mat);
    rightLeg.position.set(0.08, 0.28, 0);
    group.add(rightLeg);

    const leftFoot = new THREE.Mesh(createSphere(0.035, 0.025, 0.065), mat);
    leftFoot.position.set(-0.08, 0.03, 0.02);
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(createSphere(0.035, 0.025, 0.065), mat);
    rightFoot.position.set(0.08, 0.03, 0.02);
    group.add(rightFoot);
  }

  return group;
}

module.exports = { buildMannequinGroup };
