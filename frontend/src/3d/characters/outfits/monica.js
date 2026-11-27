import * as THREE from 'three';
import {
  createFittedHairCap,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';

/**
 * Monica Geller:
 * - Glossy jet-black sleek bob (back-tilted cap exposing bright eyes + clean side-part fringe + smooth tapered inward bob curves)
 * - Crisp white double-breasted Chef Coat (2x4 glossy dark buttons + tailored lapel edge)
 * - Tied crimson-red chef neckerchief with fluttering tails + dark trousers + black clogs
 */
export function applyMonicaStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.34,
    metalness: 0.09,
  });
  const chefWhite = new THREE.MeshStandardMaterial({
    color: '#faf7f2',
    roughness: 0.56,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: '#cf3a3a',
    roughness: 0.56,
  });
  const buttonMat = new THREE.MeshStandardMaterial({
    color: '#231f24',
    roughness: 0.32,
    metalness: 0.22,
  });

  // --- OUTFIT (Crisp double-breasted white chef coat) ---
  const chefTex = createTorsoGarmentTexture((ctx, w, h) => {
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, w, h);

    // Subtle double-breasted front panel shadow edge
    ctx.fillStyle = '#f2ece3';
    ctx.fillRect(w * 0.5 - 46, 0, 92, h);
    ctx.strokeStyle = 'rgba(80, 68, 60, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 46, 0);
    ctx.lineTo(w * 0.5 - 46, h);
    ctx.moveTo(w * 0.5 + 46, 0);
    ctx.lineTo(w * 0.5 + 46, h);
    ctx.stroke();

    // Subtle pocket accent on upper left chest
    ctx.strokeStyle = 'rgba(80, 68, 60, 0.24)';
    ctx.strokeRect(w * 0.5 + 56, h * 0.22, 34, 24);
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = chefTex;
  torsoMat.roughness = 0.56;
  torsoMat.needsUpdate = true;
  leftArm.sleeveMat.color.set('#faf7f2');
  rightArm.sleeveMat.color.set('#faf7f2');

  // Two neat vertical rows of 4 raised glossy black chef buttons
  for (let row = 0; row < 4; row += 1) {
    const by = 0.365 - row * 0.082;
    const bz = 0.194 + row * 0.006;
    for (const side of [-1, 1]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), buttonMat);
      btn.scale.set(1, 1, 0.55);
      btn.position.set(side * 0.068, by, bz);
      outfitGroup.add(btn);
    }
  }

  // Crisp chef coat lower hem flare
  const waistHem = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.262, 0.08, 24), chefWhite);
  waistHem.scale.set(1.04, 1.0, 0.85);
  waistHem.position.y = 0.025;
  outfitGroup.add(waistHem);

  // Tied crimson-red chef neckerchief with cute front knot & fluttering ends
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.034, 10, 22), scarfMat);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.set(0, 0.472, 0.008);
  outfitGroup.add(scarfRing);

  const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), scarfMat);
  scarfKnot.position.set(0.018, 0.458, 0.132);
  outfitGroup.add(scarfKnot);

  for (const [dx, rotZ, len] of [
    [-0.022, 0.26, 0.095],
    [0.05, -0.32, 0.085],
  ]) {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, len, 6, 10), scarfMat);
    tail.scale.set(1.0, 1.0, 0.45);
    tail.position.set(dx, 0.395, 0.16);
    tail.rotation.z = rotZ;
    outfitGroup.add(tail);
  }

  // Dark slim trousers & black clogs
  leftLeg.legMat.color.set('#272930');
  rightLeg.legMat.color.set('#272930');
  leftLeg.shoeMat.color.set('#1a191c');
  rightLeg.shoeMat.color.set('#1a191c');
  leftLeg.soleMat.color.set('#353438');
  rightLeg.soleMat.color.set('#353438');

  // --- HAIR (Sleek Glossy Black Bob exposing full face & bright eyes!) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.432,
      tiltBack: 0.62,
      thetaLength: Math.PI * 0.58,
      scaleX: 1.04,
      scaleY: 0.94,
      scaleZ: 1.05,
      offsetY: 0.03,
      offsetZ: -0.03,
    })
  );

  // Smooth glossy bob curtain around back of head
  const backAngles = [-0.75, -0.38, 0, 0.38, 0.75];
  for (const ang of backAngles) {
    const sx = Math.sin(ang) * 0.35;
    const sz = -Math.cos(ang) * 0.35 - 0.03;
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(sx * 0.9, 0.15, sz * 0.9),
          new THREE.Vector3(sx * 1.12, -0.05, sz - 0.04),
          new THREE.Vector3(sx * 1.02, -0.23, sz + 0.02),
          new THREE.Vector3(sx * 0.82, -0.29, sz + 0.08),
        ],
        { rootRadius: 0.092, midRadius: 0.108, tipRadius: 0.032, material: hairMat }
      )
    );
  }

  // Sleek side-swept bangs framing upper forehead above eyebrows
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(0.10, 0.36, 0.18),
        new THREE.Vector3(-0.14, 0.30, 0.32),
        new THREE.Vector3(-0.34, 0.21, 0.26),
        new THREE.Vector3(-0.41, 0.06, 0.15),
      ],
      { rootRadius: 0.064, midRadius: 0.078, tipRadius: 0.02, flattenZ: 0.7, material: hairMat }
    )
  );
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(0.10, 0.36, 0.18),
        new THREE.Vector3(0.28, 0.29, 0.29),
        new THREE.Vector3(0.39, 0.17, 0.21),
      ],
      { rootRadius: 0.06, midRadius: 0.072, tipRadius: 0.02, flattenZ: 0.7, material: hairMat }
    )
  );

  // Crisp inward-curved bob cheek curves
  for (const side of [-1, 1]) {
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(side * 0.35, 0.18, 0.07),
          new THREE.Vector3(side * 0.435, -0.02, 0.09),
          new THREE.Vector3(side * 0.39, -0.21, 0.12),
          new THREE.Vector3(side * 0.28, -0.27, 0.15),
        ],
        { rootRadius: 0.078, midRadius: 0.092, tipRadius: 0.028, material: hairMat }
      )
    );
  }
}
