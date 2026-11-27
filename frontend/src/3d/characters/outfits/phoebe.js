import * as THREE from 'three';
import { createFabricTexture } from '../CharacterMeta.js';
import {
  createFittedHairCap,
  createOutwardSkirtGeometry,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';

/**
 * Phoebe Buffay:
 * - Long flowing golden-blonde tapered wavy locks + pastel 5-flower floral headband
 * - Conformal colorful boho folk cardigan over warm cream blouse
 * - Multi-tiered beaded necklaces + properly outward-wound flowing teal maxi skirt with mustard hem
 */
export function applyPhoebeStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.42,
    metalness: 0.06,
  });
  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: meta.hairHighlight,
    roughness: 0.38,
    metalness: 0.08,
  });
  const bohoTex = createFabricTexture('boho');
  const maxiSkirtMat = new THREE.MeshStandardMaterial({
    color: '#4e7c72',
    roughness: 0.72,
    side: THREE.DoubleSide,
  });

  // --- OUTFIT (Conformal boho patterned cardigan + cream blouse front) ---
  const cardiganTex = createTorsoGarmentTexture((ctx, w, h) => {
    ctx.fillStyle = '#9b5778';
    ctx.fillRect(0, 0, w, h);

    const stripes = [
      { y: 20, hh: 24, color: '#d89b3c' },
      { y: 62, hh: 20, color: '#4b8a7d' },
      { y: 108, hh: 34, color: '#c45b47' },
      { y: 164, hh: 24, color: '#e6c16a' },
      { y: 210, hh: 24, color: '#58789e' },
    ];
    for (const s of stripes) {
      ctx.fillStyle = s.color;
      ctx.fillRect(0, s.y, w, s.hh);
    }

    ctx.fillStyle = 'rgba(255, 248, 232, 0.65)';
    for (let x = 14; x < w; x += 36) {
      ctx.beginPath();
      ctx.arc(x, 125, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18, 32, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft warm cream tunic exposed down center front (u = 0.5)
    ctx.fillStyle = '#f9f0e2';
    ctx.fillRect(w * 0.5 - 38, 0, 76, h);

    // Subtle crochet border down cardigan front edges
    ctx.strokeStyle = '#e5b85b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 38, 0);
    ctx.lineTo(w * 0.5 - 38, h);
    ctx.moveTo(w * 0.5 + 38, 0);
    ctx.lineTo(w * 0.5 + 38, h);
    ctx.stroke();
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = cardiganTex;
  torsoMat.roughness = 0.72;
  torsoMat.needsUpdate = true;

  leftArm.sleeveMat.color.set('#ffffff');
  leftArm.sleeveMat.map = bohoTex;
  leftArm.sleeveMat.roughness = 0.72;
  leftArm.sleeveMat.needsUpdate = true;

  rightArm.sleeveMat.color.set('#ffffff');
  rightArm.sleeveMat.map = bohoTex;
  rightArm.sleeveMat.roughness = 0.72;
  rightArm.sleeveMat.needsUpdate = true;

  // Multi-tiered colorful boho necklaces cleanly resting across chest
  const necklaceSpecs = [
    { y: 0.455, r: 0.132, tilt: 0.25, color: '#e2a63b' },
    { y: 0.415, r: 0.154, tilt: 0.34, color: '#39a395' },
    { y: 0.372, r: 0.174, tilt: 0.4, color: '#db6552' },
  ];
  for (const n of necklaceSpecs) {
    const mat = new THREE.MeshStandardMaterial({ color: n.color, roughness: 0.35, metalness: 0.25 });
    const cord = new THREE.Mesh(new THREE.TorusGeometry(n.r, 0.011, 8, 22), mat);
    cord.rotation.x = Math.PI / 2 + n.tilt;
    cord.position.set(0, n.y, 0.036);
    outfitGroup.add(cord);

    const charm = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), mat);
    charm.position.set(0, n.y - 0.045, 0.036 + n.r * 0.94);
    outfitGroup.add(charm);
  }

  // Properly outward-wound flowing boho maxi skirt + warm mustard hem
  const maxiSkirt = new THREE.Mesh(
    createOutwardSkirtGeometry(-0.24, 0.13, 0.325, 0.23, 32),
    maxiSkirtMat
  );
  maxiSkirt.castShadow = true;
  outfitGroup.add(maxiSkirt);

  const hemBorder = new THREE.Mesh(
    new THREE.TorusGeometry(0.322, 0.02, 8, 28),
    new THREE.MeshStandardMaterial({ color: '#e6b74e', roughness: 0.65 })
  );
  hemBorder.rotation.x = Math.PI / 2;
  hemBorder.scale.set(1.05, 0.88, 1.0);
  hemBorder.position.y = -0.225;
  outfitGroup.add(hemBorder);

  leftLeg.legMat.color.set('#44685f');
  rightLeg.legMat.color.set('#44685f');
  leftLeg.shoeMat.color.set('#7a4e32');
  rightLeg.shoeMat.color.set('#7a4e32');
  leftLeg.soleMat.color.set('#4a2d1c');
  rightLeg.soleMat.color.set('#4a2d1c');

  // --- HAIR (Long golden wavy tapered locks + pastel floral headband — clean open face!) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.432,
      tiltBack: 0.62,
      thetaLength: Math.PI * 0.58,
      scaleX: 1.04,
      scaleY: 0.94,
      scaleZ: 1.05,
      offsetY: 0.032,
      offsetZ: -0.028,
    })
  );

  // Flowing tapered wavy locks cascading down back & shoulders
  const backAngles = [-0.82, -0.42, 0, 0.42, 0.82];
  backAngles.forEach((ang, idx) => {
    const sx = Math.sin(ang) * 0.35;
    const sz = -Math.cos(ang) * 0.35 - 0.03;
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(sx * 0.88, 0.16, sz * 0.88),
          new THREE.Vector3(sx * 1.12, -0.08, sz - 0.05),
          new THREE.Vector3(sx * 1.04, -0.34, sz + 0.02),
          new THREE.Vector3(sx * 1.08, -0.56, sz - 0.04),
        ],
        {
          rootRadius: 0.085,
          midRadius: 0.10,
          tipRadius: 0.024,
          material: idx % 2 === 0 ? hairMat : hairHighlightMat,
        }
      )
    );
  });

  // Soft center-parted front wavy strands sweeping cleanly above brows & past shoulders
  for (const side of [-1, 1]) {
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(side * 0.04, 0.37, 0.18),
          new THREE.Vector3(side * 0.28, 0.27, 0.24),
          new THREE.Vector3(side * 0.43, 0.02, 0.15),
          new THREE.Vector3(side * 0.41, -0.26, 0.17),
          new THREE.Vector3(side * 0.36, -0.49, 0.13),
        ],
        {
          rootRadius: 0.068,
          midRadius: 0.085,
          tipRadius: 0.022,
          material: hairHighlightMat,
        }
      )
    );
  }

  // Bohemian Floral Headband across crown!
  const bandMat = new THREE.MeshStandardMaterial({ color: '#4d7f59', roughness: 0.55 });
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.435, 0.017, 8, 28, Math.PI * 1.12),
    bandMat
  );
  band.rotation.z = -Math.PI * 0.06;
  band.rotation.x = -0.38;
  band.position.set(0, 0.11, 0.05);
  hairGroup.add(band);

  const flowerColors = ['#f58da8', '#ffe07d', '#ffffff', '#f5a97f', '#b89be8'];
  const flowerCenterMat = new THREE.MeshStandardMaterial({ color: '#f2b830', roughness: 0.4 });
  for (let i = 0; i < 5; i += 1) {
    const t = -0.82 + i * 0.41;
    const fx = Math.sin(t) * 0.43;
    const fy = 0.22 + Math.cos(t) * 0.21;
    const fz = 0.24 + Math.cos(t) * 0.05;

    const flower = new THREE.Group();
    flower.position.set(fx, fy, fz);
    flower.lookAt(fx * 2, fy + 0.3, fz + 1.0);

    const petalMat = new THREE.MeshStandardMaterial({ color: flowerColors[i], roughness: 0.45 });
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), petalMat);
      petal.scale.set(1.0, 1.0, 0.5);
      petal.position.set(Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0);
      flower.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), flowerCenterMat);
    center.position.z = 0.012;
    flower.add(center);
    hairGroup.add(flower);
  }
}
