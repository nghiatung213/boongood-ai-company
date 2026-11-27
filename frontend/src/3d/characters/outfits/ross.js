import * as THREE from 'three';
import { createFabricTexture } from '../CharacterMeta.js';
import {
  createFittedHairCap,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';

/**
 * Ross Geller:
 * - Neatly combed glossy dark-brown hair with clean open forehead & subtle professor volume
 * - Conformal brown tweed blazer over light-blue shirt + navy tie + suede elbow patches on sleeves
 * - Charcoal academic trousers + dark dress shoes
 */
export function applyRossStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.36,
    metalness: 0.08,
  });
  const tweedTex = createFabricTexture('tweed');
  const elbowPatchMat = new THREE.MeshStandardMaterial({
    color: '#3f281b',
    roughness: 0.85,
  });
  const lightBlueShirtMat = new THREE.MeshStandardMaterial({
    color: '#c9e0f5',
    roughness: 0.56,
  });

  // --- OUTFIT (Conformal speckled brown tweed blazer + light-blue shirt + navy tie) ---
  const blazerTex = createTorsoGarmentTexture((ctx, w, h) => {
    // Rich brown herringbone tweed base
    ctx.fillStyle = '#75533c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(42, 26, 16, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 10) {
      ctx.beginPath();
      for (let x = 0; x < w; x += 20) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 5);
        ctx.lineTo(x + 20, y);
      }
      ctx.stroke();
    }
    const speckles = ['#9c7b5c', '#4a3222', '#b89b79', '#5c3f2c'];
    for (let i = 0; i < 420; i += 1) {
      ctx.fillStyle = speckles[i % speckles.length];
      ctx.fillRect((i * 47) % w, (i * 67) % h, 3, 3);
    }

    // Light-blue collared shirt exposed in blazer V-front
    ctx.fillStyle = '#c9e0f5';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 42, 0);
    ctx.lineTo(w * 0.5 + 42, 0);
    ctx.lineTo(w * 0.5 + 12, h * 0.68);
    ctx.lineTo(w * 0.5 - 12, h * 0.68);
    ctx.closePath();
    ctx.fill();

    // Academic navy tie with subtle dots
    ctx.fillStyle = '#2d4159';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 10, 0);
    ctx.lineTo(w * 0.5 + 10, 0);
    ctx.lineTo(w * 0.5 + 13, h * 0.56);
    ctx.lineTo(w * 0.5, h * 0.66);
    ctx.lineTo(w * 0.5 - 13, h * 0.56);
    ctx.closePath();
    ctx.fill();

    // Tweed blazer lapels flanking the blue shirt
    ctx.fillStyle = '#856047';
    ctx.strokeStyle = 'rgba(42, 26, 16, 0.42)';
    ctx.lineWidth = 3;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + dir * 42, 0);
      ctx.lineTo(w * 0.5 + dir * 70, h * 0.25);
      ctx.lineTo(w * 0.5 + dir * 52, h * 0.42);
      ctx.lineTo(w * 0.5 + dir * 60, h * 0.5);
      ctx.lineTo(w * 0.5 + dir * 12, h * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = blazerTex;
  torsoMat.roughness = 0.78;
  torsoMat.needsUpdate = true;

  leftArm.sleeveMat.color.set('#ffffff');
  leftArm.sleeveMat.map = tweedTex;
  leftArm.sleeveMat.roughness = 0.8;
  leftArm.sleeveMat.needsUpdate = true;

  rightArm.sleeveMat.color.set('#ffffff');
  rightArm.sleeveMat.map = tweedTex;
  rightArm.sleeveMat.roughness = 0.8;
  rightArm.sleeveMat.needsUpdate = true;

  // Signature professor suede elbow patches on both tweed sleeves!
  for (const [arm, side] of [
    [leftArm, -1],
    [rightArm, 1],
  ]) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), elbowPatchMat);
    patch.scale.set(0.55, 1.15, 0.76);
    patch.position.set(side * 0.044, -0.145, -0.02);
    arm.armPivot.add(patch);
  }

  // Light-blue dress collar & neat blazer buttons
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.024, 8, 20),
    lightBlueShirtMat
  );
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 0.485, 0.005);
  outfitGroup.add(collarRing);

  const btnMat = new THREE.MeshStandardMaterial({ color: '#3b2619', roughness: 0.5 });
  for (const by of [0.16, 0.085]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), btnMat);
    btn.scale.set(1, 1, 0.55);
    btn.position.set(0.022, by, 0.205);
    outfitGroup.add(btn);
  }

  // Charcoal trousers & dark leather shoes
  leftLeg.legMat.color.set('#31343b');
  rightLeg.legMat.color.set('#31343b');
  leftLeg.shoeMat.color.set('#261d19');
  rightLeg.shoeMat.color.set('#261d19');
  leftLeg.soleMat.color.set('#1a1412');
  rightLeg.soleMat.color.set('#1a1412');

  // --- HAIR (Neatly combed slick dark-brown hair — clean open forehead & expressive thick brows!) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.428,
      tiltBack: 0.66,
      thetaLength: Math.PI * 0.56,
      scaleX: 1.03,
      scaleY: 0.96,
      scaleZ: 1.04,
      offsetY: 0.036,
      offsetZ: -0.028,
    })
  );

  // Smooth combed-back hairline contour wave high on crown (classic Ross silhouette)
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.34, 0.22, 0.18),
        new THREE.Vector3(-0.14, 0.34, 0.24),
        new THREE.Vector3(0.14, 0.34, 0.24),
        new THREE.Vector3(0.34, 0.22, 0.18),
      ],
      { rootRadius: 0.06, midRadius: 0.082, tipRadius: 0.055, flattenZ: 0.72, material: hairMat }
    )
  );

  for (const side of [-1, 1]) {
    const sideComb = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.11, 6, 10), hairMat);
    sideComb.position.set(side * 0.395, 0.06, 0.045);
    hairGroup.add(sideComb);
  }
}
