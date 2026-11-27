import * as THREE from 'three';
import { createFabricTexture } from '../CharacterMeta.js';
import {
  createFittedHairCap,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';

/**
 * Joey Tribbiani:
 * - Tousled charming dark-brown messy sweeps (clean open forehead exposing flirty wink!)
 * - Conformal open black leather jacket with folded biker lapels & crisp silver zipper teeth over white crewneck tee
 * - Woven blue denim jeans + rugged dark boots
 */
export function applyJoeyStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.45,
    metalness: 0.05,
  });
  const whiteTeeMat = new THREE.MeshStandardMaterial({
    color: '#f8f5f0',
    roughness: 0.65,
  });
  const denimTex = createFabricTexture('denim');

  // --- OUTFIT (Conformal open black leather jacket + crisp white tee + metallic silver zipper) ---
  const jacketTex = createTorsoGarmentTexture((ctx, w, h) => {
    // Sleek black leather base
    ctx.fillStyle = '#232226';
    ctx.fillRect(0, 0, w, h);

    // Subtle leather panel seam highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.5 - 110, h * 0.18, 42, h * 0.62);
    ctx.strokeRect(w * 0.5 + 68, h * 0.18, 42, h * 0.62);

    // Crisp white crewneck t-shirt cleanly exposed in open center
    ctx.fillStyle = '#f8f5f0';
    ctx.fillRect(w * 0.5 - 40, 0, 80, h);

    // Folded biker jacket lapels
    ctx.fillStyle = '#302f36';
    ctx.strokeStyle = '#141317';
    ctx.lineWidth = 3;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + dir * 40, 0);
      ctx.lineTo(w * 0.5 + dir * 78, h * 0.16);
      ctx.lineTo(w * 0.5 + dir * 52, h * 0.46);
      ctx.lineTo(w * 0.5 + dir * 40, h * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Metallic silver zipper rails down both open edges!
    for (const dir of [-1, 1]) {
      const zx = w * 0.5 + dir * 40;
      ctx.fillStyle = '#cfd6e0';
      ctx.fillRect(zx - 3, 0, 6, h);
      ctx.fillStyle = '#7c8594';
      for (let zy = 6; zy < h; zy += 10) {
        ctx.fillRect(zx - 3, zy, 6, 3);
      }
    }
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = jacketTex;
  torsoMat.roughness = 0.34;
  torsoMat.metalness = 0.14;
  torsoMat.needsUpdate = true;

  leftArm.sleeveMat.color.set('#232226');
  leftArm.sleeveMat.roughness = 0.32;
  leftArm.sleeveMat.metalness = 0.15;
  rightArm.sleeveMat.color.set('#232226');
  rightArm.sleeveMat.roughness = 0.32;
  rightArm.sleeveMat.metalness = 0.15;

  // White crewneck collar rim + dark biker collar edge
  const crewNeck = new THREE.Mesh(new THREE.TorusGeometry(0.114, 0.022, 8, 20), whiteTeeMat);
  crewNeck.rotation.x = Math.PI / 2;
  crewNeck.position.set(0, 0.482, 0.008);
  outfitGroup.add(crewNeck);

  // Blue denim jeans + rugged dark boots
  leftLeg.legMat.color.set('#ffffff');
  leftLeg.legMat.map = denimTex;
  leftLeg.legMat.roughness = 0.78;
  leftLeg.legMat.needsUpdate = true;

  rightLeg.legMat.color.set('#ffffff');
  rightLeg.legMat.map = denimTex;
  rightLeg.legMat.roughness = 0.78;
  rightLeg.legMat.needsUpdate = true;

  leftLeg.shoeMat.color.set('#2c221e');
  rightLeg.shoeMat.color.set('#2c221e');
  leftLeg.soleMat.color.set('#473832');
  rightLeg.soleMat.color.set('#473832');

  // --- HAIR (Tousled charming messy dark-brown hair — natural swept layers, zero spiky sausages!) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.428,
      tiltBack: 0.64,
      thetaLength: Math.PI * 0.56,
      scaleX: 1.04,
      scaleY: 0.95,
      scaleZ: 1.04,
      offsetY: 0.034,
      offsetZ: -0.028,
    })
  );

  // Softly tousled layered front sweeps sitting gracefully high on forehead
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.24, 0.33, 0.20),
        new THREE.Vector3(-0.08, 0.36, 0.28),
        new THREE.Vector3(0.08, 0.31, 0.31),
      ],
      { rootRadius: 0.068, midRadius: 0.078, tipRadius: 0.022, flattenZ: 0.75, material: hairMat }
    )
  );
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(0.02, 0.36, 0.21),
        new THREE.Vector3(0.20, 0.33, 0.27),
        new THREE.Vector3(0.35, 0.21, 0.21),
      ],
      { rootRadius: 0.065, midRadius: 0.075, tipRadius: 0.02, flattenZ: 0.75, material: hairMat }
    )
  );
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.08, 0.36, 0.20),
        new THREE.Vector3(-0.26, 0.29, 0.26),
        new THREE.Vector3(-0.37, 0.17, 0.19),
      ],
      { rootRadius: 0.06, midRadius: 0.07, tipRadius: 0.02, flattenZ: 0.75, material: hairMat }
    )
  );

  for (const side of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 6, 10), hairMat);
    sb.position.set(side * 0.395, 0.06, 0.05);
    hairGroup.add(sb);
  }
}
