import * as THREE from 'three';
import {
  createFittedHairCap,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';

/**
 * Chandler Bing:
 * - Neat swept chestnut-brown hair cleanly framing forehead & witty brows
 * - Navy-blue diamond-knit sweater vest with crisp V-neck white dress shirt & burgundy-gold striped tie
 * - Leather belt + warm khaki chinos + brown loafers
 */
export function applyChandlerStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.48,
    metalness: 0.04,
  });
  const shirtWhiteMat = new THREE.MeshStandardMaterial({
    color: '#f8f6f2',
    roughness: 0.56,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: '#523422',
    roughness: 0.45,
  });

  // --- OUTFIT (Conformal navy argyle-knit vest + crisp white V-shirt + striped tie) ---
  const vestTex = createTorsoGarmentTexture((ctx, w, h) => {
    // Rich navy knit base
    ctx.fillStyle = '#243c5e';
    ctx.fillRect(0, 0, w, h);

    // Soft diamond argyle knit pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= h; y += 36) {
      for (let x = 0; x <= w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x + 18, y);
        ctx.lineTo(x, y + 18);
        ctx.lineTo(x - 18, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(222, 184, 120, 0.24)';
    for (let y = 18; y < h; y += 36) {
      for (let x = 18; x < w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 9, y);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 9, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Crisp white dress-shirt V-opening centered at u = 0.5
    ctx.fillStyle = '#f8f6f2';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 48, 0);
    ctx.lineTo(w * 0.5 + 48, 0);
    ctx.lineTo(w * 0.5, h * 0.46);
    ctx.closePath();
    ctx.fill();

    // Ribbed navy V-neck trim
    ctx.strokeStyle = '#1a2c47';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 48, 0);
    ctx.lineTo(w * 0.5, h * 0.46);
    ctx.lineTo(w * 0.5 + 48, 0);
    ctx.stroke();

    // Burgundy & gold diagonal-stripe necktie drawn flush down the V
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 11, 0);
    ctx.lineTo(w * 0.5 + 11, 0);
    ctx.lineTo(w * 0.5 + 14, h * 0.36);
    ctx.lineTo(w * 0.5, h * 0.46);
    ctx.lineTo(w * 0.5 - 14, h * 0.36);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#852b37';
    ctx.fillRect(w * 0.5 - 20, 0, 40, h * 0.5);
    ctx.strokeStyle = '#e5be6d';
    ctx.lineWidth = 4;
    for (let sy = -20; sy < h * 0.55; sy += 16) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 22, sy);
      ctx.lineTo(w * 0.5 + 22, sy + 18);
      ctx.stroke();
    }
    ctx.restore();
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = vestTex;
  torsoMat.roughness = 0.74;
  torsoMat.needsUpdate = true;

  // Crisp white dress-shirt sleeves
  leftArm.sleeveMat.color.set('#f8f6f2');
  leftArm.sleeveMat.roughness = 0.56;
  rightArm.sleeveMat.color.set('#f8f6f2');
  rightArm.sleeveMat.roughness = 0.56;

  // Neat folded white shirt collar wings around neck
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.025, 8, 20),
    shirtWhiteMat
  );
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 0.485, 0.005);
  outfitGroup.add(collarRing);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.062, 6, 10), shirtWhiteMat);
    wing.scale.set(1.0, 1.0, 0.42);
    wing.position.set(side * 0.072, 0.475, 0.11);
    wing.rotation.z = side * 0.68;
    wing.rotation.y = -side * 0.35;
    outfitGroup.add(wing);
  }

  // Raised 3D tie knot at collar
  const tieKnot = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 10),
    new THREE.MeshStandardMaterial({ color: '#852b37', roughness: 0.45 })
  );
  tieKnot.scale.set(1.0, 0.9, 0.65);
  tieKnot.position.set(0, 0.46, 0.145);
  outfitGroup.add(tieKnot);

  // Leather belt & warm brass buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.236, 0.242, 0.05, 24), beltMat);
  belt.scale.set(1.04, 1.0, 0.85);
  belt.position.y = 0.04;
  outfitGroup.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 0.022),
    new THREE.MeshStandardMaterial({ color: '#cfa65c', roughness: 0.3, metalness: 0.65 })
  );
  buckle.position.set(0, 0.04, 0.208);
  outfitGroup.add(buckle);

  // Khaki chinos + classic brown loafers
  leftLeg.legMat.color.set('#bfa786');
  rightLeg.legMat.color.set('#bfa786');
  leftLeg.shoeMat.color.set('#5a3925');
  rightLeg.shoeMat.color.set('#5a3925');
  leftLeg.soleMat.color.set('#382216');
  rightLeg.soleMat.color.set('#382216');

  // --- HAIR (Neat 90s swept brown hair cleanly exposing eyebrows & smirk) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.426,
      tiltBack: 0.64,
      thetaLength: Math.PI * 0.56,
      scaleX: 1.03,
      scaleY: 0.94,
      scaleZ: 1.04,
      offsetY: 0.032,
      offsetZ: -0.028,
    })
  );

  // Soft side-swept top fringe sitting neatly high on forehead
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.28, 0.28, 0.22),
        new THREE.Vector3(-0.04, 0.35, 0.29),
        new THREE.Vector3(0.22, 0.30, 0.26),
        new THREE.Vector3(0.36, 0.18, 0.16),
      ],
      { rootRadius: 0.058, midRadius: 0.075, tipRadius: 0.022, flattenZ: 0.72, material: hairMat }
    )
  );
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.18, 0.35, 0.18),
        new THREE.Vector3(-0.33, 0.24, 0.22),
        new THREE.Vector3(-0.39, 0.08, 0.11),
      ],
      { rootRadius: 0.05, midRadius: 0.062, tipRadius: 0.018, material: hairMat }
    )
  );

  // Neat tapered sideburns
  for (const side of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.1, 6, 10), hairMat);
    sb.position.set(side * 0.395, 0.05, 0.05);
    hairGroup.add(sb);
  }
}
