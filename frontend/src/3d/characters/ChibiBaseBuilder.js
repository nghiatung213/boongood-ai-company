import * as THREE from 'three';

export const HEAD_RADIUS = 0.4;

/**
 * Shared smooth Vinyl Chibi head contour function (Pop Mart / Animal Crossing cheek fullness).
 * Applied identically to BOTH headMesh and facePatchMesh so the 1:1 UV face decal hugs the
 * vinyl skin surface seamlessly with zero floating seam or z-fighting.
 */
export function shapeChibiHeadVertex(v, outwardOffset = 0) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  const nx = v.x / len;
  const ny = v.y / len;
  const nz = v.z / len;

  // Apply tiny outward offset along radial normal for the front face patch
  let x = v.x + nx * outwardOffset;
  let y = v.y + ny * outwardOffset;
  let z = v.z + nz * outwardOffset;

  // Softly squash vertically for adorable wide-head chibi proportion (~46% total height)
  y *= 0.91;

  // Soft chubby cheeks in lower-mid face (ny between -0.58 and 0.12)
  const cheekBell = Math.exp(-Math.pow((ny + 0.24) / 0.34, 2));
  x *= 1 + 0.068 * cheekBell;
  z *= 1 + 0.035 * cheekBell;

  // Slight gentle rounding at very bottom chin
  if (ny < -0.62) {
    const chinFactor = (-0.62 - ny) / 0.38;
    const shrink = 1 - 0.06 * chinFactor;
    x *= shrink;
    z *= shrink;
  }

  v.set(x, y, z);
}

function buildSculptedHeadGeometry(radius, widthSegs, heightSegs, phiStart, phiLength, thetaStart, thetaLength, outwardOffset = 0) {
  const geo = new THREE.SphereGeometry(
    radius,
    widthSegs,
    heightSegs,
    phiStart,
    phiLength,
    thetaStart,
    thetaLength
  );
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    shapeChibiHeadVertex(v, outwardOffset);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a soft radial ground contact shadow texture (zero shadow-map cost at 60fps!).
 */
let sharedBlobShadowTex = null;
function getBlobShadowTexture() {
  if (sharedBlobShadowTex) return sharedBlobShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(38, 24, 16, 0.34)');
  grad.addColorStop(0.6, 'rgba(38, 24, 16, 0.14)');
  grad.addColorStop(1, 'rgba(38, 24, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedBlobShadowTex = new THREE.CanvasTexture(canvas);
  return sharedBlobShadowTex;
}

/**
 * Builds the shared sculpted Vinyl Chibi base rig (no raw boxes!):
 * - Total height ~1.70u (Head ~46% height = 0.78u, Bell torso ~0.50u, Legs+shoes ~0.38u)
 * - Curved 1:1 UV front face patch matching FaceTextureManager 512x512 canvas
 * - Articulated pivots: bodyPivot, torsoGroup, headPivot, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot
 */
export function createChibiBase(meta, faceTexture) {
  const rootGroup = new THREE.Group();
  rootGroup.name = `agent_${meta.id}`;
  rootGroup.userData.characterId = meta.id;

  const skinMat = new THREE.MeshStandardMaterial({
    color: meta.skinColor,
    roughness: 0.62,
    metalness: 0.0,
  });

  // 1. Soft contact shadow disc on floor
  const shadowBlob = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    new THREE.MeshBasicMaterial({
      map: getBlobShadowTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.008;
  rootGroup.add(shadowBlob);

  // 2. Ground status halo ring (IDLE subtle / WORKING amber / WAITING_APPROVAL terracotta pulse)
  const stateRingMat = new THREE.MeshBasicMaterial({
    color: meta.accentColor,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const stateRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.43, 32), stateRingMat);
  stateRing.rotation.x = -Math.PI / 2;
  stateRing.position.y = 0.012;
  rootGroup.add(stateRing);

  // 3. Body pivot (controls vertical bob, walk bounce, crouch, lean)
  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'bodyPivot';
  rootGroup.add(bodyPivot);

  // 4. Legs & rounded Pop Mart vinyl shoes (hip pivot at y = 0.36)
  const buildLeg = (side) => {
    const legPivot = new THREE.Group();
    legPivot.name = side < 0 ? 'leftLegPivot' : 'rightLegPivot';
    legPivot.position.set(side * 0.115, 0.36, 0);

    const legMat = new THREE.MeshStandardMaterial({
      color: '#34363d',
      roughness: 0.72,
    });
    const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.16, 8, 14), legMat);
    legMesh.position.y = -0.14;
    legMesh.castShadow = true;
    legMesh.name = 'legMesh';
    legPivot.add(legMesh);

    const shoeMat = new THREE.MeshStandardMaterial({
      color: '#2b2220',
      roughness: 0.45,
      metalness: 0.06,
    });
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.305, 0.032);
    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.085, 8, 14), shoeMat);
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.scale.set(1.06, 1.0, 0.78);
    shoeUpper.castShadow = true;
    shoeGroup.add(shoeUpper);

    const soleMat = new THREE.MeshStandardMaterial({ color: '#efe7dc', roughness: 0.6 });
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.076, 0.026, 14), soleMat);
    sole.scale.set(1.0, 1.0, 1.38);
    sole.position.y = -0.042;
    shoeGroup.add(sole);

    legPivot.add(shoeGroup);
    return { legPivot, legMesh, legMat, shoeMat, soleMat };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyPivot.add(leftLeg.legPivot);
  bodyPivot.add(rightLeg.legPivot);

  // 5. Torso group (starts at hip level y = 0.36, rises to shoulder y = 0.85)
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torsoGroup';
  torsoGroup.position.set(0, 0.36, 0);
  bodyPivot.add(torsoGroup);

  // Smooth bell-shaped LatheGeometry torso (collectible vinyl silhouette)
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.19, 0.01),
    new THREE.Vector2(0.245, 0.09),
    new THREE.Vector2(0.235, 0.24),
    new THREE.Vector2(0.21, 0.41),
    new THREE.Vector2(0.155, 0.48),
    new THREE.Vector2(0.085, 0.50),
    new THREE.Vector2(0.0, 0.50),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 28);
  // Rotate torso UVs by PI so u = 0.5 aligns dead-center on front (+Z) chest
  torsoGeo.rotateY(Math.PI);
  torsoGeo.scale(1.04, 1.0, 0.84);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: '#d8cfc5',
    roughness: 0.65,
  });
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoMesh.name = 'torsoMesh';
  torsoGroup.add(torsoMesh);

  // Smooth short neck hiding head-tilt seam
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.11, 16), skinMat);
  neckMesh.position.y = 0.51;
  torsoGroup.add(neckMesh);

  // Container for layered clothing details (lapels, ties, skirts, buttons, necklaces)
  const outfitGroup = new THREE.Group();
  outfitGroup.name = 'outfitGroup';
  torsoGroup.add(outfitGroup);

  // 6. Articulated Arms with rounded vinyl palms & prop anchors
  const buildArm = (side) => {
    const armPivot = new THREE.Group();
    armPivot.name = side < 0 ? 'leftArmPivot' : 'rightArmPivot';
    armPivot.position.set(side * 0.245, 0.43, 0);

    const sleeveMat = new THREE.MeshStandardMaterial({
      color: '#d8cfc5',
      roughness: 0.62,
    });
    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.21, 8, 14), sleeveMat);
    armMesh.position.y = -0.135;
    armMesh.castShadow = true;
    armPivot.add(armMesh);

    // Cute rounded vinyl hand + tiny thumb nub
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.28, 0.01);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), skinMat);
    palm.scale.set(0.95, 1.05, 0.88);
    palm.castShadow = true;
    handGroup.add(palm);

    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), skinMat);
    thumb.position.set(-side * 0.048, 0.01, 0.03);
    handGroup.add(thumb);

    const handAnchor = new THREE.Group();
    handAnchor.name = side < 0 ? 'leftHandAnchor' : 'rightHandAnchor';
    handAnchor.position.set(0, -0.02, 0.075);
    handGroup.add(handAnchor);

    armPivot.add(handGroup);
    return { armPivot, armMesh, sleeveMat, handGroup, handAnchor };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  torsoGroup.add(leftArm.armPivot);
  torsoGroup.add(rightArm.armPivot);

  // 7. Head Pivot (centered at neck base y = 0.54 in torso space => world y = 0.90)
  const headPivot = new THREE.Group();
  headPivot.name = 'headPivot';
  headPivot.position.set(0, 0.54, 0);
  torsoGroup.add(headPivot);

  // Center of head sits at y = 0.365 above headPivot -> top of head at world y ≈ 1.64 (hair to ~1.72)
  const headCenterY = 0.365;

  const headGeo = buildSculptedHeadGeometry(HEAD_RADIUS, 36, 28, 0, Math.PI * 2, 0, Math.PI, 0);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = headCenterY;
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headMesh.name = 'headMesh';
  headPivot.add(headMesh);

  // Cute sculpted ears
  const earGeo = new THREE.SphereGeometry(0.078, 14, 12);
  earGeo.scale(0.55, 0.92, 0.72);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.405, headCenterY - 0.04, -0.01);
    ear.castShadow = true;
    headPivot.add(ear);
  }

  // Delicate tiny 3D button nose positioned smoothly between chibi eyes & mouth
  const noseMat = skinMat.clone();
  noseMat.color.offsetHSL(0, 0.05, -0.035);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 10), noseMat);
  nose.scale.set(1.08, 0.82, 0.72);
  nose.position.set(0, headCenterY - 0.072, HEAD_RADIUS + 0.01);
  headPivot.add(nose);

  // 8. Distortion-Free 1:1 Curved Front Face Patch (phi centered at +Z = PI/2)
  const dPhi = 1.42;
  const dTheta = 1.42;
  const facePatchGeo = buildSculptedHeadGeometry(
    HEAD_RADIUS,
    24,
    24,
    Math.PI * 0.5 - dPhi * 0.5,
    dPhi,
    Math.PI * 0.5 - dTheta * 0.5 + 0.14,
    dTheta,
    0.0045
  );
  const facePatchMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    transparent: true,
    alphaTest: 0.01,
    roughness: 0.52,
    metalness: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const facePatchMesh = new THREE.Mesh(facePatchGeo, facePatchMat);
  facePatchMesh.position.y = headCenterY;
  facePatchMesh.name = 'facePatchMesh';
  facePatchMesh.renderOrder = 2;
  headPivot.add(facePatchMesh);

  // 9. Multi-layer Hair container positioned at head center
  const hairGroup = new THREE.Group();
  hairGroup.name = 'hairGroup';
  hairGroup.position.y = headCenterY;
  headPivot.add(hairGroup);

  // 10. UI Anchor directly above head for Name tag, Speech Bubbles & Emote Particles
  const uiAnchor = new THREE.Group();
  uiAnchor.name = 'uiAnchor';
  uiAnchor.position.set(0, 1.88, 0);
  rootGroup.add(uiAnchor);

  return {
    rootGroup,
    shadowBlob,
    stateRing,
    stateRingMat,
    bodyPivot,
    torsoGroup,
    torsoMesh,
    torsoMat,
    outfitGroup,
    headPivot,
    headMesh,
    facePatchMesh,
    hairGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    uiAnchor,
    skinMat,
    headCenterY,
  };
}
