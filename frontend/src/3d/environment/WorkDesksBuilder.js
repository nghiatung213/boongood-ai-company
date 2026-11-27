import * as THREE from 'three';
import { CHARACTER_META } from '../characters/CharacterMeta.js';
import { ZONE_DEFINITIONS } from './OfficeLayout.js';

function tagZone(group, zoneId) {
  group.userData.zoneId = zoneId;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.zoneId = zoneId;
    }
  });
}

function createScreenTexture(accentHex, lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 256, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Be Vietnam Pro", sans-serif';
  ctx.fillText(lines[0] || 'BOONGOOD', 12, 20);

  // Cute decorative chart/content lines
  ctx.fillStyle = '#e5dcd1';
  ctx.fillRect(14, 46, 140, 12);
  ctx.fillRect(14, 68, 190, 10);
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(14, 118, 28, 26);
  ctx.fillRect(54, 102, 28, 42);
  ctx.fillRect(94, 88, 28, 56);
  ctx.fillRect(134, 110, 28, 34);
  ctx.globalAlpha = 1;
  if (lines[1]) {
    ctx.fillStyle = '#5a4940';
    ctx.font = '600 13px "Be Vietnam Pro", sans-serif';
    ctx.fillText(lines[1], 14, 100);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Shared warm Scandinavian wood desk + ergonomic swivel chair + glowing laptop + desk lamp.
 */
function buildBaseDesk(ownerId, screenTitle, screenSub, lampBulbMats) {
  const meta = CHARACTER_META[ownerId];
  const group = new THREE.Group();

  const deskWoodMat = new THREE.MeshStandardMaterial({ color: '#e6caa8', roughness: 0.62 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#4a3a32', roughness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: meta.accentColor, roughness: 0.62 });

  // Rounded-feel tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.92), deskWoodMat);
  top.position.y = 0.76;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Colored desk blotter mat matching character accent
  const blotter = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.012, 0.44),
    accentMat
  );
  blotter.position.set(0, 0.806, 0.14);
  group.add(blotter);

  // 4 sleek angled legs
  for (const [lx, lz] of [
    [-0.76, -0.36],
    [0.76, -0.36],
    [-0.76, 0.36],
    [0.76, 0.36],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.76, 10), legMat);
    leg.position.set(lx, 0.38, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Open Laptop with character-themed glowing UI
  const laptop = new THREE.Group();
  laptop.position.set(-0.04, 0.81, -0.02);
  const silverMat = new THREE.MeshStandardMaterial({ color: '#d7dce3', roughness: 0.3, metalness: 0.5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), silverMat);
  laptop.add(base);

  const screenBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.018), silverMat);
  screenBack.position.set(0, 0.14, -0.15);
  screenBack.rotation.x = -0.22;
  laptop.add(screenBack);

  const screenTex = createScreenTexture(meta.accentColor, [screenTitle, screenSub]);
  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.24),
    new THREE.MeshStandardMaterial({
      map: screenTex,
      emissive: '#ffffff',
      emissiveMap: screenTex,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    })
  );
  screenFace.position.set(0, 0.14, -0.138);
  screenFace.rotation.x = -0.22;
  laptop.add(screenFace);
  group.add(laptop);

  // Cozy miniature desk lamp (glows warmly in Evening Chill mode)
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 12), legMat);
  lampBase.position.set(-0.68, 0.815, -0.26);
  group.add(lampBase);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8), legMat);
  lampStem.position.set(-0.68, 0.98, -0.26);
  group.add(lampStem);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fff1d4',
    emissive: '#ffad4d',
    emissiveIntensity: 0.2,
    roughness: 0.35,
  });
  lampBulbMats.push(bulbMat);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 14), bulbMat);
  lampShade.position.set(-0.66, 1.15, -0.22);
  lampShade.rotation.z = -0.15;
  group.add(lampShade);

  // Cute round office stool/chair tucked in front of desk
  const chair = new THREE.Group();
  chair.position.set(0, 0, 0.72);
  const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.44, 10), legMat);
  chairPole.position.y = 0.22;
  chair.add(chairPole);
  const chairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.09, 18), accentMat);
  chairSeat.position.y = 0.46;
  chairSeat.castShadow = true;
  chair.add(chairSeat);
  const chairBack = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 12), accentMat);
  chairBack.rotation.z = Math.PI / 2;
  chairBack.scale.set(1.0, 1.0, 0.45);
  chairBack.position.set(0, 0.68, 0.2);
  chair.add(chairBack);
  group.add(chair);

  return group;
}

/**
 * Builds all 6 personal desks with iconic character-specific BoonGood props!
 */
export function buildWorkDesks() {
  const root = new THREE.Group();
  root.name = 'work_desks';
  const lampBulbMats = [];

  // 1. RACHEL'S DESK — Pastel BoonGood gift box, Pantone swatches, Lily flower vase
  const rachelDesk = buildBaseDesk('rachel', 'BRAND & DESIGN', 'Pantone Pastel', lampBulbMats);
  const rDef = ZONE_DEFINITIONS.desk_rachel;
  rachelDesk.position.set(...rDef.position);
  rachelDesk.rotation.y = rDef.rotationY;

  // Pastel BoonGood gift box with ribbon bow
  const giftBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.24),
    new THREE.MeshStandardMaterial({ color: '#f5d2c8', roughness: 0.55 })
  );
  giftBox.position.set(0.56, 0.88, 0.08);
  giftBox.rotation.y = 0.22;
  giftBox.castShadow = true;
  rachelDesk.add(giftBox);
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.29, 0.17, 0.05),
    new THREE.MeshStandardMaterial({ color: '#d96f62', roughness: 0.45 })
  );
  ribbon.position.copy(giftBox.position);
  ribbon.rotation.y = 0.22;
  rachelDesk.add(ribbon);

  // Cute white vase with lilies
  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: '#fbf7f0', roughness: 0.3 })
  );
  vase.position.set(0.58, 0.9, -0.26);
  rachelDesk.add(vase);
  for (const [fx, fz] of [
    [0.54, -0.25],
    [0.62, -0.27],
    [0.58, -0.22],
  ]) {
    const lily = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.09, 8),
      new THREE.MeshStandardMaterial({ color: '#fff8ee', roughness: 0.5 })
    );
    lily.position.set(fx, 1.06, fz);
    lily.rotation.x = Math.PI;
    rachelDesk.add(lily);
  }
  tagZone(rachelDesk, 'desk_rachel');
  root.add(rachelDesk);

  // 2. MONICA'S DESK — Label maker, Homemade jam jar, Neat folded towel stack
  const monicaDesk = buildBaseDesk('monica', 'QC CHECKLIST', '100% Clean', lampBulbMats);
  const mDef = ZONE_DEFINITIONS.desk_monica;
  monicaDesk.position.set(...mDef.position);
  monicaDesk.rotation.y = mDef.rotationY;

  // Label maker
  const labelMaker = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.09, 0.14),
    new THREE.MeshStandardMaterial({ color: '#394654', roughness: 0.45 })
  );
  labelMaker.position.set(0.54, 0.845, 0.12);
  monicaDesk.add(labelMaker);

  // Homemade 4am berry jam jar with gingham lid!
  const jamJar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.078, 0.16, 14),
    new THREE.MeshStandardMaterial({ color: '#a82b47', roughness: 0.25 })
  );
  jamJar.position.set(0.58, 0.88, -0.22);
  monicaDesk.add(jamJar);
  const jamLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.082, 0.04, 14),
    new THREE.MeshStandardMaterial({ color: '#f2e4d0', roughness: 0.65 })
  );
  jamLid.position.set(0.58, 0.97, -0.22);
  monicaDesk.add(jamLid);

  // Ultra-neat folded towels (part of the 11 categories!)
  const towelColors = ['#ffffff', '#e8d8c8', '#d46a6a'];
  towelColors.forEach((col, i) => {
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.045, 0.2),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })
    );
    towel.position.set(-0.56, 0.825 + i * 0.048, 0.18);
    monicaDesk.add(towel);
  });
  tagZone(monicaDesk, 'desk_monica');
  root.add(monicaDesk);

  // 3. CHANDLER'S DESK — Secondary Finance_Models monitor, Coffee mug, TV Guide magazine
  const chandlerDesk = buildBaseDesk('chandler', 'FINANCE_MODELS', 'Margin 58%', lampBulbMats);
  const cDef = ZONE_DEFINITIONS.desk_chandler;
  chandlerDesk.position.set(...cDef.position);
  chandlerDesk.rotation.y = cDef.rotationY;

  // Second monitor displaying profit trend
  const monStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.06, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: '#383d45', roughness: 0.4 })
  );
  monStand.position.set(0.54, 0.87, -0.22);
  chandlerDesk.add(monStand);
  const monScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.3, 0.03),
    new THREE.MeshStandardMaterial({ color: '#2b313a', roughness: 0.4 })
  );
  monScreen.position.set(0.54, 1.05, -0.22);
  monScreen.rotation.y = -0.35;
  chandlerDesk.add(monScreen);

  // TV Guide ("Ms. Chanandler Bong") magazine + ceramic coffee mug
  const tvGuide = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.022, 0.26),
    new THREE.MeshStandardMaterial({ color: '#d44c3d', roughness: 0.55 })
  );
  tvGuide.position.set(0.56, 0.812, 0.18);
  tvGuide.rotation.y = -0.18;
  chandlerDesk.add(tvGuide);

  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.048, 0.11, 12),
    new THREE.MeshStandardMaterial({ color: '#f7eee0', roughness: 0.35 })
  );
  mug.position.set(-0.48, 0.855, 0.2);
  chandlerDesk.add(mug);
  tagZone(chandlerDesk, 'desk_chandler');
  root.add(chandlerDesk);

  // 4. ROSS'S DESK — Miniature Velociraptor dinosaur figurine, Ammonite fossil, Briefcase of Facts!
  const rossDesk = buildBaseDesk('ross', 'MARKET & LEGAL', 'Unagi Check', lampBulbMats);
  const roDef = ZONE_DEFINITIONS.desk_ross;
  rossDesk.position.set(...roDef.position);
  rossDesk.rotation.y = roDef.rotationY;

  // Stylized cute 3D Velociraptor figurine on stand
  const dino = new THREE.Group();
  dino.position.set(0.56, 0.8, -0.16);
  dino.rotation.y = -0.5;
  const dinoMat = new THREE.MeshStandardMaterial({ color: '#4c8c62', roughness: 0.55 });
  const dinoBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.14, 6, 10), dinoMat);
  dinoBody.rotation.z = 0.5;
  dinoBody.position.set(0, 0.14, 0);
  dino.add(dinoBody);
  const dinoHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), dinoMat);
  dinoHead.scale.set(1.3, 0.85, 0.85);
  dinoHead.position.set(-0.11, 0.23, 0);
  dino.add(dinoHead);
  const dinoTail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 8), dinoMat);
  dinoTail.rotation.z = -1.25;
  dinoTail.position.set(0.14, 0.13, 0);
  dino.add(dinoTail);
  rossDesk.add(dino);

  // Ammonite spiral fossil disc
  const fossil = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.025, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#c4b399', roughness: 0.85 })
  );
  fossil.rotation.x = Math.PI / 2;
  fossil.position.set(0.52, 0.825, 0.2);
  rossDesk.add(fossil);

  // Leather "Briefcase of Facts" leaning beside desk
  const briefcase = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.3, 0.12),
    new THREE.MeshStandardMaterial({ color: '#613c24', roughness: 0.6 })
  );
  briefcase.position.set(0.92, 0.16, 0.05);
  briefcase.rotation.y = 0.25;
  briefcase.castShadow = true;
  rossDesk.add(briefcase);

  tagZone(rossDesk, 'desk_ross');
  root.add(rossDesk);

  // 5. JOEY'S DESK — Original Hugsy penguin plush, Ring-Light tripod, Joey Special pizza box!
  const joeyDesk = buildBaseDesk('joey', 'REELS & TIKTOK', 'How you doin?', lampBulbMats);
  const jDef = ZONE_DEFINITIONS.desk_joey;
  joeyDesk.position.set(...jDef.position);
  joeyDesk.rotation.y = jDef.rotationY;

  // Original Hugsy (bedtime penguin pal with yellow puffer vest & ski goggles!)
  const hugsy = new THREE.Group();
  hugsy.position.set(0.58, 0.8, -0.18);
  hugsy.rotation.y = -0.35;
  const penguinBlack = new THREE.MeshStandardMaterial({ color: '#24252a', roughness: 0.72 });
  const penguinWhite = new THREE.MeshStandardMaterial({ color: '#f8f5ef', roughness: 0.72 });
  const vestYellow = new THREE.MeshStandardMaterial({ color: '#f2c138', roughness: 0.6 });
  const hBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.1, 8, 12), vestYellow);
  hBody.position.y = 0.13;
  hugsy.add(hBody);
  const hBelly = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), penguinWhite);
  hBelly.position.set(0, 0.12, 0.04);
  hugsy.add(hBelly);
  const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), penguinBlack);
  hHead.position.y = 0.26;
  hugsy.add(hHead);
  const hBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.025, 0.05, 8),
    new THREE.MeshStandardMaterial({ color: '#eb7d2d', roughness: 0.5 })
  );
  hBeak.rotation.x = Math.PI / 2;
  hBeak.position.set(0, 0.25, 0.09);
  hugsy.add(hBeak);
  joeyDesk.add(hugsy);

  // Glowing Ring-Light on mini tabletop tripod for filming BoonGood Reels!
  const ringStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.04, 0.34, 10),
    new THREE.MeshStandardMaterial({ color: '#2b2a2e', roughness: 0.4 })
  );
  ringStand.position.set(-0.56, 0.97, -0.1);
  joeyDesk.add(ringStand);
  const ringBulbMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#fff4df',
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  lampBulbMats.push(ringBulbMat);
  const ringLight = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 22), ringBulbMat);
  ringLight.position.set(-0.56, 1.24, -0.1);
  ringLight.rotation.y = 0.45;
  joeyDesk.add(ringLight);

  // Joey Special pizza box on corner of desk
  const pizzaBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.05, 0.32),
    new THREE.MeshStandardMaterial({ color: '#ebd7ba', roughness: 0.78 })
  );
  pizzaBox.position.set(0.55, 0.825, 0.2);
  pizzaBox.rotation.y = 0.14;
  joeyDesk.add(pizzaBox);

  tagZone(joeyDesk, 'desk_joey');
  root.add(joeyDesk);

  // 6. PHOEBE'S DESK — Acoustic guitar on stand, Boho plant, Thank-you cards & scented candle
  const phoebeDesk = buildBaseDesk('phoebe', 'CX & IDEAS', 'Plan A + Plan B', lampBulbMats);
  const pDef = ZONE_DEFINITIONS.desk_phoebe;
  phoebeDesk.position.set(...pDef.position);
  phoebeDesk.rotation.y = pDef.rotationY;

  // Standing acoustic guitar leaning right beside Phoebe's desk
  const standGuitar = new THREE.Group();
  standGuitar.position.set(1.02, 0.36, -0.05);
  standGuitar.rotation.set(-0.18, -0.35, 0.08);
  const woodLight = new THREE.MeshStandardMaterial({ color: '#db9c56', roughness: 0.48 });
  const woodDark = new THREE.MeshStandardMaterial({ color: '#6b3e24', roughness: 0.55 });
  const gLower = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 18), woodLight);
  gLower.rotation.x = Math.PI / 2;
  standGuitar.add(gLower);
  const gUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 18), woodLight);
  gUpper.rotation.x = Math.PI / 2;
  gUpper.position.y = 0.22;
  standGuitar.add(gUpper);
  const gNeck = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.46, 0.032), woodDark);
  gNeck.position.y = 0.54;
  standGuitar.add(gNeck);
  const gHole = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 14),
    new THREE.MeshStandardMaterial({ color: '#24140c', roughness: 0.9 })
  );
  gHole.position.set(0, 0.12, 0.042);
  standGuitar.add(gHole);
  phoebeDesk.add(standGuitar);

  // Colorful stack of BoonGood handwritten thank-you cards & warm scented candle
  const cardColors = ['#f5c2cf', '#fae1a5', '#c3e0d3'];
  cardColors.forEach((col, i) => {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.014, 0.16),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.65 })
    );
    card.position.set(0.54 + i * 0.015, 0.81 + i * 0.015, 0.16);
    card.rotation.y = -0.15 + i * 0.12;
    phoebeDesk.add(card);
  });

  const candleJar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.11, 12),
    new THREE.MeshStandardMaterial({ color: '#f2e0c9', roughness: 0.4 })
  );
  candleJar.position.set(0.56, 0.855, -0.2);
  phoebeDesk.add(candleJar);
  const flameMat = new THREE.MeshStandardMaterial({
    color: '#ffdd75',
    emissive: '#ff9922',
    emissiveIntensity: 0.9,
  });
  lampBulbMats.push(flameMat);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), flameMat);
  flame.position.set(0.56, 0.935, -0.2);
  phoebeDesk.add(flame);

  tagZone(phoebeDesk, 'desk_phoebe');
  root.add(phoebeDesk);

  return {
    group: root,
    setLightingMode(mode) {
      const isEvening = mode === 'evening';
      for (const bm of lampBulbMats) {
        bm.emissiveIntensity = isEvening ? 1.35 : 0.25;
      }
    },
  };
}
