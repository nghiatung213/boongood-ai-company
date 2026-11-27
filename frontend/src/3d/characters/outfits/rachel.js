import * as THREE from 'three';
import { createFabricTexture } from '../CharacterMeta.js';
import {
  createFittedHairCap,
  createOutwardSkirtGeometry,
  createTaperedHairStrand,
  createTorsoGarmentTexture,
} from '../HairSculptHelpers.js';
import { createSwatchFanProp } from '../HandheldProps.js';

/**
 * Rachel Green:
 * - Layered warm honey-caramel "The Rachel" hair (back-tilted cap + tapered face-framing inward curls + swoop bangs well above brows)
 * - Conformal beige tailored blazer with clean V-lapels over sleek black turtleneck
 * - Outward-wound 90s caramel/espresso plaid pleated mini-skirt + dark tights + warm brown boots
 */
export function applyRachelStyle(parts, meta) {
  const { torsoMat, outfitGroup, hairGroup, leftArm, rightArm, leftLeg, rightLeg } = parts;

  const hairMat = new THREE.MeshStandardMaterial({
    color: meta.hairColor,
    roughness: 0.44,
    metalness: 0.05,
  });
  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: meta.hairHighlight,
    roughness: 0.4,
    metalness: 0.06,
  });
  const blazerMat = new THREE.MeshStandardMaterial({
    color: '#dec9b0',
    roughness: 0.66,
  });
  const turtleneckMat = new THREE.MeshStandardMaterial({
    color: '#221f22',
    roughness: 0.72,
  });
  const plaidTex = createFabricTexture('plaid');
  const plaidMat = new THREE.MeshStandardMaterial({
    map: plaidTex,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  // --- OUTFIT (Conformal beige blazer over sleek black turtleneck) ---
  const garmentTex = createTorsoGarmentTexture((ctx, w, h) => {
    ctx.fillStyle = '#dec9b0';
    ctx.fillRect(0, 0, w, h);

    // Subtle tailored vertical seam shading
    ctx.fillStyle = 'rgba(135, 108, 82, 0.16)';
    ctx.fillRect(w * 0.5 - 58, 0, 4, h);
    ctx.fillRect(w * 0.5 + 54, 0, 4, h);

    // Sleek black turtleneck exposed in crisp V-neck front opening (centered at u = 0.5)
    ctx.fillStyle = '#221f22';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 42, 0);
    ctx.lineTo(w * 0.5 + 42, 0);
    ctx.lineTo(w * 0.5 + 16, h * 0.74);
    ctx.lineTo(w * 0.5 - 16, h * 0.74);
    ctx.closePath();
    ctx.fill();

    // Tailored blazer lapels flanking the V-opening
    ctx.fillStyle = '#ebdac4';
    ctx.strokeStyle = 'rgba(120, 96, 72, 0.32)';
    ctx.lineWidth = 3;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + dir * 42, 0);
      ctx.lineTo(w * 0.5 + dir * 68, h * 0.24);
      ctx.lineTo(w * 0.5 + dir * 50, h * 0.42);
      ctx.lineTo(w * 0.5 + dir * 58, h * 0.5);
      ctx.lineTo(w * 0.5 + dir * 16, h * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Center blazer button line below V
    ctx.strokeStyle = 'rgba(110, 86, 66, 0.35)';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.74);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();
  });

  torsoMat.color.set('#ffffff');
  torsoMat.map = garmentTex;
  torsoMat.roughness = 0.66;
  torsoMat.needsUpdate = true;

  leftArm.sleeveMat.color.set('#dec9b0');
  rightArm.sleeveMat.color.set('#dec9b0');

  // High ribbed black turtleneck collar wrapping neck cleanly
  const turtleCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.118, 0.128, 0.095, 20),
    turtleneckMat
  );
  turtleCollar.position.set(0, 0.495, 0.005);
  outfitGroup.add(turtleCollar);

  // Subtle metallic gold blazer button
  const blazerBtn = new THREE.Mesh(
    new THREE.SphereGeometry(0.017, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#cfa35a', roughness: 0.3, metalness: 0.55 })
  );
  blazerBtn.scale.set(1, 1, 0.55);
  blazerBtn.position.set(0.024, 0.145, 0.205);
  outfitGroup.add(blazerBtn);

  // Properly outward-wound flared plaid mini-skirt
  const skirt = new THREE.Mesh(
    createOutwardSkirtGeometry(-0.08, 0.14, 0.305, 0.23, 32),
    plaidMat
  );
  skirt.castShadow = true;
  outfitGroup.add(skirt);

  // Dark tights & chic warm brown ankle boots
  leftLeg.legMat.color.set('#2c272b');
  rightLeg.legMat.color.set('#2c272b');
  leftLeg.shoeMat.color.set('#5a392a');
  rightLeg.shoeMat.color.set('#5a392a');
  leftLeg.soleMat.color.set('#382319');
  rightLeg.soleMat.color.set('#382319');

  // Tiny pastel swatch fan in left hand
  const swatch = createSwatchFanProp();
  swatch.position.set(-0.02, -0.02, 0.02);
  swatch.scale.setScalar(0.75);
  leftArm.handAnchor.add(swatch);

  // --- HAIR ("The Rachel" — back-tilted dome + sculpted parted bangs + closed tapered inward layers) ---
  hairGroup.add(
    createFittedHairCap(hairMat, {
      radius: 0.432,
      tiltBack: 0.62,
      thetaLength: Math.PI * 0.58,
      scaleX: 1.05,
      scaleY: 0.94,
      scaleZ: 1.06,
      offsetY: 0.03,
      offsetZ: -0.03,
    })
  );

  // Plush layered back hair volume (tapered strands cascading down back of head)
  const backAngles = [-0.72, -0.36, 0, 0.36, 0.72];
  backAngles.forEach((ang, idx) => {
    const sx = Math.sin(ang) * 0.35;
    const sz = -Math.cos(ang) * 0.35 - 0.03;
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(sx * 0.85, 0.16, sz * 0.85),
          new THREE.Vector3(sx * 1.12, -0.06, sz - 0.05),
          new THREE.Vector3(sx * 1.05, -0.26, sz - 0.02),
          new THREE.Vector3(sx * 0.90, -0.38, sz + 0.04),
        ],
        {
          rootRadius: 0.09,
          midRadius: 0.105,
          tipRadius: 0.028,
          material: idx % 2 === 0 ? hairMat : hairHighlightMat,
        }
      )
    );
  });

  // Soft side-part swooping bangs gracefully framing UPPER forehead (well above eyebrows!)
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.08, 0.36, 0.18),
        new THREE.Vector3(-0.22, 0.29, 0.31),
        new THREE.Vector3(-0.37, 0.18, 0.26),
        new THREE.Vector3(-0.42, 0.04, 0.16),
      ],
      { rootRadius: 0.068, midRadius: 0.082, tipRadius: 0.022, flattenZ: 0.72, material: hairHighlightMat }
    )
  );
  hairGroup.add(
    createTaperedHairStrand(
      [
        new THREE.Vector3(-0.06, 0.37, 0.18),
        new THREE.Vector3(0.16, 0.30, 0.32),
        new THREE.Vector3(0.35, 0.20, 0.27),
        new THREE.Vector3(0.42, 0.05, 0.16),
      ],
      { rootRadius: 0.072, midRadius: 0.088, tipRadius: 0.024, flattenZ: 0.72, material: hairMat }
    )
  );

  // Signature inward-curled feathered side layers ("The Rachel" flip!)
  for (const side of [-1, 1]) {
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(side * 0.35, 0.20, 0.06),
          new THREE.Vector3(side * 0.44, -0.02, 0.08),
          new THREE.Vector3(side * 0.41, -0.24, 0.12),
          new THREE.Vector3(side * 0.27, -0.35, 0.17),
        ],
        { rootRadius: 0.078, midRadius: 0.095, tipRadius: 0.024, material: hairMat }
      )
    );
    hairGroup.add(
      createTaperedHairStrand(
        [
          new THREE.Vector3(side * 0.36, 0.12, 0.16),
          new THREE.Vector3(side * 0.43, -0.08, 0.18),
          new THREE.Vector3(side * 0.33, -0.25, 0.22),
        ],
        { rootRadius: 0.055, midRadius: 0.068, tipRadius: 0.018, material: hairHighlightMat }
      )
    );
  }
}
