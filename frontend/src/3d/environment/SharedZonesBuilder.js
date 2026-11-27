import * as THREE from 'three';
import { ZONE_DEFINITIONS } from './OfficeLayout.js';

function tagZone(group, zoneId) {
  group.userData.zoneId = zoneId;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.zoneId = zoneId;
    }
  });
}

function makeTextPlate(text, { width = 256, height = 96, bg = '#fff7df', fg = '#2b1f1a', border = '#c84b4b', fontSize = 32, subText = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, width - 12, height - 12);
  }
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontSize}px "Be Vietnam Pro", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, subText ? height * 0.4 : height * 0.52);
  if (subText) {
    ctx.font = `600 ${Math.round(fontSize * 0.55)}px "Be Vietnam Pro", sans-serif`;
    ctx.fillText(subText, width / 2, height * 0.74);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#993d33';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#e6bd6b';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 228);
  ctx.strokeStyle = '#336154';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, 200, 200);
  // Central medallion diamond
  ctx.fillStyle = '#e8c780';
  ctx.beginPath();
  ctx.moveTo(128, 64);
  ctx.lineTo(192, 128);
  ctx.lineTo(128, 192);
  ctx.lineTo(64, 128);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#477265';
  ctx.beginPath();
  ctx.arc(128, 128, 28, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the 6 iconic shared Friends zones:
 * 1. purple_door (Purple door + Yellow peephole frame + #20 badge)
 * 2. orange_sofa (Central Perk rust-orange tufted sofa + coffee table + RESERVED sign)
 * 3. foosball_table (Classic foosball table with red/blue player rods)
 * 4. coffee_counter (Central Perk espresso bar, regular/decaf pots, chalkboard menu)
 * 5. chick_duck_corner (Animated Chick & Duck, Pat the Dog statue, Magna Doodle, Rosita chair)
 * 6. monica_secret_closet (Locked teal-green door with "DO NOT OPEN" note & rattle trigger)
 */
export function buildSharedZones() {
  const root = new THREE.Group();
  root.name = 'shared_zones';

  // --- 1. PURPLE DOOR (#20 & Yellow Peephole Frame) ---
  const doorGroup = new THREE.Group();
  doorGroup.position.set(...ZONE_DEFINITIONS.purple_door.position);

  const doorPurpleMat = new THREE.MeshStandardMaterial({ color: '#6b4f8c', roughness: 0.65 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: '#5c417a', roughness: 0.7 });
  const frameGoldMat = new THREE.MeshStandardMaterial({ color: '#f2c744', roughness: 0.35, metalness: 0.25 });
  const whiteFrameMat = new THREE.MeshStandardMaterial({ color: '#f7f0e6', roughness: 0.65 });

  // Door outer casing
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 2.75, 0.16), whiteFrameMat);
  doorFrame.position.set(0, 1.38, 0.12);
  doorGroup.add(doorFrame);

  const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.6, 0.14), doorPurpleMat);
  doorSlab.position.set(0, 1.32, 0.17);
  doorSlab.castShadow = true;
  doorGroup.add(doorSlab);

  // Recessed decorative panels
  for (const py of [0.68, 1.9]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.84, 0.04), doorPanelMat);
    panel.position.set(0, py, 0.24);
    doorGroup.add(panel);
  }

  // Iconic Yellow Frame around Peephole with ornate gilded corners!
  const yellowFrameOuter = new THREE.Group();
  yellowFrameOuter.position.set(0, 1.88, 0.27);
  for (const [bw, bh, bx, by] of [
    [0.54, 0.075, 0, 0.29],
    [0.54, 0.075, 0, -0.29],
    [0.075, 0.58, -0.25, 0],
    [0.075, 0.58, 0.25, 0],
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.048), frameGoldMat);
    bar.position.set(bx, by, 0);
    yellowFrameOuter.add(bar);
  }
  for (const [cx, cy] of [
    [-0.255, 0.295],
    [0.255, 0.295],
    [-0.255, -0.295],
    [0.255, -0.295],
  ]) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 10), frameGoldMat);
    finial.scale.set(1.0, 1.0, 0.55);
    finial.position.set(cx, cy, 0.01);
    yellowFrameOuter.add(finial);
  }
  // Peephole brass lens in center
  const peephole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: '#c49844', roughness: 0.3, metalness: 0.75 })
  );
  peephole.rotation.x = Math.PI / 2;
  yellowFrameOuter.add(peephole);
  doorGroup.add(yellowFrameOuter);

  // Brass doorknob & #20 plaque
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#d4a64a', roughness: 0.3, metalness: 0.7 })
  );
  knob.position.set(0.5, 1.15, 0.28);
  doorGroup.add(knob);

  const plaque20 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.16),
    new THREE.MeshBasicMaterial({
      map: makeTextPlate('20', { width: 128, height: 72, bg: '#f2c744', fg: '#3b2454', border: '#5c417a', fontSize: 44 }),
    })
  );
  plaque20.position.set(0, 2.38, 0.25);
  doorGroup.add(plaque20);

  tagZone(doorGroup, 'purple_door');
  root.add(doorGroup);

  // --- 2. MONICA'S SECRET CLOSET (Locked Teal Door + "DO NOT OPEN" note) ---
  const closetGroup = new THREE.Group();
  closetGroup.position.set(...ZONE_DEFINITIONS.monica_secret_closet.position);

  const closetFrame = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.55, 0.16), whiteFrameMat);
  closetFrame.position.set(0, 1.28, 0.12);
  closetGroup.add(closetFrame);

  const closetDoorPivot = new THREE.Group();
  closetDoorPivot.position.set(-0.56, 0, 0.18);
  const closetSlab = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 2.42, 0.12),
    new THREE.MeshStandardMaterial({ color: '#4f7a73', roughness: 0.68 })
  );
  closetSlab.position.set(0.56, 1.22, 0);
  closetSlab.castShadow = true;
  closetDoorPivot.add(closetSlab);

  // Padlock with steel shackle & brass hasp + bright sticky sign "DO NOT OPEN"
  const brassLockMat = new THREE.MeshStandardMaterial({ color: '#d4a64a', roughness: 0.3, metalness: 0.75 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#c4cbd4', roughness: 0.25, metalness: 0.85 });
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.025), steelMat);
  hasp.position.set(1.01, 1.2, 0.068);
  closetDoorPivot.add(hasp);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 8, 16, Math.PI), steelMat);
  shackle.position.set(0.98, 1.15, 0.088);
  closetDoorPivot.add(shackle);
  const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.055), brassLockMat);
  padlock.position.set(0.98, 1.09, 0.088);
  closetDoorPivot.add(padlock);

  const warningSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.3),
    new THREE.MeshBasicMaterial({
      map: makeTextPlate('DO NOT OPEN', {
        width: 256,
        height: 112,
        bg: '#fff3b8',
        fg: '#b82c2c',
        border: '#b82c2c',
        fontSize: 30,
        subText: 'MONICA ONLY!',
      }),
    })
  );
  warningSign.position.set(0.56, 1.66, 0.075);
  warningSign.rotation.z = -0.05;
  closetDoorPivot.add(warningSign);

  closetGroup.add(closetDoorPivot);
  tagZone(closetGroup, 'monica_secret_closet');
  root.add(closetGroup);

  // --- 3. CENTRAL PERK ORANGE SOFA + COFFEE TABLE + RESERVED SIGN ---
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(...ZONE_DEFINITIONS.orange_sofa.position);

  // Warm woven Persian lounge rug underneath sofa & table
  const loungeRug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 3.1),
    new THREE.MeshStandardMaterial({ map: createRugTexture(), roughness: 0.92 })
  );
  loungeRug.rotation.x = -Math.PI / 2;
  loungeRug.position.set(0, 0.01, 0.55);
  loungeRug.receiveShadow = true;
  sofaGroup.add(loungeRug);

  const sofaOrangeMat = new THREE.MeshStandardMaterial({ color: '#d86538', roughness: 0.8 });
  const sofaVelvetDark = new THREE.MeshStandardMaterial({ color: '#bf522a', roughness: 0.85 });
  const sofaDarkWoodMat = new THREE.MeshStandardMaterial({ color: '#4f3324', roughness: 0.65 });

  // Sofa turned wooden feet
  for (const [fx, fz] of [
    [-1.24, -0.36],
    [1.24, -0.36],
    [-1.24, 0.36],
    [1.24, 0.36],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.036, 0.2, 10), sofaDarkWoodMat);
    leg.position.set(fx, 0.1, fz);
    sofaGroup.add(leg);
  }

  // Carved wood apron trim & plush sofa base
  const woodApron = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.08, 0.98), sofaDarkWoodMat);
  woodApron.position.set(0, 0.21, 0);
  sofaGroup.add(woodApron);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.24, 0.96), sofaVelvetDark);
  sofaBase.position.set(0, 0.35, 0);
  sofaBase.castShadow = true;
  sofaGroup.add(sofaBase);

  // 3 plump velvet seat cushions
  for (let i = -1; i <= 1; i += 1) {
    const cushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.36, 8, 14), sofaOrangeMat);
    cushion.rotation.z = Math.PI / 2;
    cushion.scale.set(1.0, 0.85, 1.48);
    cushion.position.set(i * 0.8, 0.52, 0.08);
    cushion.castShadow = true;
    sofaGroup.add(cushion);
  }

  // Sculpted Central Perk tufted backrest (flush with armrests — no hotdog overhang!)
  const backFrame = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.72, 0.24), sofaVelvetDark);
  backFrame.position.set(0, 0.78, -0.37);
  backFrame.castShadow = true;
  sofaGroup.add(backFrame);

  // 3 plush tufted back pillows + decorative tuft buttons
  const buttonMat = new THREE.MeshStandardMaterial({ color: '#9c3e1c', roughness: 0.75 });
  for (let i = -1; i <= 1; i += 1) {
    const backPillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 8, 14), sofaOrangeMat);
    backPillow.rotation.z = Math.PI / 2;
    backPillow.scale.set(1.0, 1.38, 0.65);
    backPillow.position.set(i * 0.78, 0.84, -0.25);
    backPillow.castShadow = true;
    sofaGroup.add(backPillow);

    for (const bx of [-0.16, 0.16]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), buttonMat);
      btn.position.set(i * 0.78 + bx, 0.86, -0.1);
      sofaGroup.add(btn);
    }
  }

  // Gently arched Victorian wood crown rail along top of sofa back
  const topWoodRail = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.075, 0.12), sofaDarkWoodMat);
  topWoodRail.position.set(0, 1.15, -0.36);
  sofaGroup.add(topWoodRail);

  // Plump rolled Victorian armrests with wooden front medallions
  for (const side of [-1, 1]) {
    const armBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.92), sofaVelvetDark);
    armBase.position.set(side * 1.32, 0.56, 0);
    sofaGroup.add(armBase);

    const armRoll = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.68, 10, 14), sofaOrangeMat);
    armRoll.rotation.x = Math.PI / 2;
    armRoll.position.set(side * 1.34, 0.76, 0.02);
    armRoll.castShadow = true;
    sofaGroup.add(armRoll);

    const armWood = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14), sofaDarkWoodMat);
    armWood.rotation.x = Math.PI / 2;
    armWood.position.set(side * 1.34, 0.76, 0.48);
    sofaGroup.add(armWood);
  }

  // Throw pillows in Central Perk mustard & sage resting naturally against corners
  for (const [px, col, rot] of [
    [-0.95, '#e8b954', 0.35],
    [0.95, '#4b826d', -0.35],
  ]) {
    const pillow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 14, 12),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.82 })
    );
    pillow.scale.set(1.0, 0.95, 0.42);
    pillow.position.set(px, 0.72, -0.05);
    pillow.rotation.set(-0.2, rot, 0);
    sofaGroup.add(pillow);
  }

  // Wooden Coffee Table in front of sofa + iconic RESERVED tent sign + mugs
  const tableGroup = new THREE.Group();
  tableGroup.position.set(0, 0, 1.15);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.85), sofaDarkWoodMat);
  tableTop.position.y = 0.46;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableGroup.add(tableTop);

  for (const [lx, lz] of [
    [-0.75, -0.32],
    [0.75, -0.32],
    [-0.75, 0.32],
    [0.75, 0.32],
  ]) {
    const tleg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.46, 10), sofaDarkWoodMat);
    tleg.position.set(lx, 0.23, lz);
    tableGroup.add(tleg);
  }

  // RESERVED tent plaque right in center of coffee table!
  const reservedTex = makeTextPlate('RESERVED', {
    width: 256,
    height: 96,
    bg: '#fffaf0',
    fg: '#1f4a3a',
    border: '#d66236',
    fontSize: 38,
  });
  const reservedSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ map: reservedTex, roughness: 0.5 })
  );
  reservedSign.position.set(0, 0.59, 0.04);
  reservedSign.rotation.x = -0.24;
  tableGroup.add(reservedSign);

  // Oversized Central Perk mugs on table
  for (const [mx, mz, col] of [
    [-0.52, -0.12, '#f5ebd8'],
    [0.48, 0.14, '#e6b85c'],
  ]) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.062, 0.15, 14),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 })
    );
    mug.position.set(mx, 0.57, mz);
    tableGroup.add(mug);
  }

  sofaGroup.add(tableGroup);
  tagZone(sofaGroup, 'orange_sofa');
  root.add(sofaGroup);

  // --- 4. FOOSBALL TABLE ---
  const foosGroup = new THREE.Group();
  foosGroup.position.set(...ZONE_DEFINITIONS.foosball_table.position);

  const foosWoodMat = new THREE.MeshStandardMaterial({ color: '#b57b4a', roughness: 0.62 });
  const pitchMat = new THREE.MeshStandardMaterial({ color: '#3b8c52', roughness: 0.78 });
  const rodMat = new THREE.MeshStandardMaterial({ color: '#cfd6de', roughness: 0.25, metalness: 0.85 });
  const redTeamMat = new THREE.MeshStandardMaterial({ color: '#d4453d', roughness: 0.5 });
  const blueTeamMat = new THREE.MeshStandardMaterial({ color: '#3565a8', roughness: 0.5 });

  // 4 sturdy tapered table legs
  for (const [lx, lz] of [
    [-0.78, -0.45],
    [0.78, -0.45],
    [-0.78, 0.45],
    [0.78, 0.45],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.76, 0.11), foosWoodMat);
    leg.position.set(lx, 0.38, lz);
    leg.castShadow = true;
    foosGroup.add(leg);
  }

  // Cabinet walls & green pitch
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.26, 1.05), foosWoodMat);
  cabinet.position.y = 0.86;
  cabinet.castShadow = true;
  foosGroup.add(cabinet);

  const pitch = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.04, 0.88), pitchMat);
  pitch.position.y = 0.99;
  foosGroup.add(pitch);

  // 4 chrome rods with miniature red & blue players
  const rodXs = [-0.52, -0.18, 0.18, 0.52];
  rodXs.forEach((rx, idx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8), rodMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(rx, 1.05, 0);
    foosGroup.add(rod);

    const teamMat = idx % 2 === 0 ? redTeamMat : blueTeamMat;
    for (const pz of [-0.24, 0, 0.24]) {
      const player = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.08, 6, 8), teamMat);
      player.position.set(rx, 1.03, pz);
      foosGroup.add(player);
    }
  });

  // Tiny white foosball in center
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 10),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 })
  );
  ball.position.set(0.04, 1.04, 0.06);
  foosGroup.add(ball);

  tagZone(foosGroup, 'foosball_table');
  root.add(foosGroup);

  // --- 5. CENTRAL PERK COFFEE COUNTER ---
  const counterGroup = new THREE.Group();
  counterGroup.position.set(...ZONE_DEFINITIONS.coffee_counter.position);

  const counterWoodMat = new THREE.MeshStandardMaterial({ color: '#5e3c29', roughness: 0.65 });
  const counterPanelMat = new THREE.MeshStandardMaterial({ color: '#4d3020', roughness: 0.7 });
  const marbleTopMat = new THREE.MeshStandardMaterial({ color: '#efe5d6', roughness: 0.4 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#d4a84f', roughness: 0.28, metalness: 0.72 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d8dee6', roughness: 0.2, metalness: 0.82 });
  const blackHandleMat = new THREE.MeshStandardMaterial({ color: '#242224', roughness: 0.5 });

  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.02, 1.05), counterWoodMat);
  counterBody.position.y = 0.51;
  counterBody.castShadow = true;
  counterBody.receiveShadow = true;
  counterGroup.add(counterBody);

  // Decorative front recessed wood paneling on cafe counter
  for (const px of [-1.05, 0, 1.05]) {
    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.68, 0.04), counterPanelMat);
    frontPanel.position.set(px, 0.52, 0.525);
    counterGroup.add(frontPanel);
  }

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.08, 1.15), marbleTopMat);
  counterTop.position.y = 1.06;
  counterTop.receiveShadow = true;
  counterGroup.add(counterTop);

  // Detailed Vintage Italian Brass & Chrome Espresso Machine
  const espressoGrp = new THREE.Group();
  espressoGrp.position.set(-0.88, 1.1, -0.1);
  const espDripTray = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.54), chromeMat);
  espDripTray.position.set(0, 0.04, 0.06);
  espressoGrp.add(espDripTray);

  const espBack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.46, 0.34), brassMat);
  espBack.position.set(0, 0.3, -0.06);
  espBack.castShadow = true;
  espressoGrp.add(espBack);

  const espHood = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.48), brassMat);
  espHood.position.set(0, 0.48, 0.01);
  espressoGrp.add(espHood);

  // Twin chrome group heads + black portafilter handles + pressure dial
  for (const gx of [-0.21, 0.21]) {
    const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.1, 12), chromeMat);
    groupHead.position.set(gx, 0.37, 0.18);
    espressoGrp.add(groupHead);

    const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.17, 8), blackHandleMat);
    pfHandle.rotation.x = Math.PI / 2;
    pfHandle.position.set(gx, 0.34, 0.28);
    espressoGrp.add(pfHandle);

    // Tiny espresso cup sitting under each group head
    const tinyCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.032, 0.07, 12),
      new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.3 })
    );
    tinyCup.position.set(gx, 0.12, 0.18);
    espressoGrp.add(tinyCup);
  }
  const dial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.025, 14),
    new THREE.MeshStandardMaterial({ color: '#faf4e6', roughness: 0.35 })
  );
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0, 0.47, 0.255);
  espressoGrp.add(dial);

  // Brass boiler dome & stacked cups on top warmer shelf
  const espressoDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), brassMat);
  espressoDome.position.set(-0.22, 0.59, -0.06);
  espressoGrp.add(espressoDome);
  for (const cx of [0.1, 0.26]) {
    const warmCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.042, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: '#f7f1e6', roughness: 0.35 })
    );
    warmCup.position.set(cx, 0.595, -0.02);
    espressoGrp.add(warmCup);
  }
  counterGroup.add(espressoGrp);

  // Rachel's iconic Regular (black handle) vs Decaf (orange handle) glass carafes!
  for (const [cx, handleCol] of [
    [0.08, '#222022'],
    [0.46, '#e8702a'],
  ]) {
    const potGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.13, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: '#f2e8dc', transparent: true, opacity: 0.42, roughness: 0.1 })
    );
    potGlass.position.set(cx, 1.22, 0.14);
    counterGroup.add(potGlass);

    const coffeeLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.12, 0.15, 14),
      new THREE.MeshStandardMaterial({ color: '#3b1e0f', roughness: 0.25 })
    );
    coffeeLiquid.position.set(cx, 1.18, 0.14);
    counterGroup.add(coffeeLiquid);

    const handleMat = new THREE.MeshStandardMaterial({ color: handleCol, roughness: 0.45 });
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.04, 14), handleMat);
    lid.position.set(cx, 1.35, 0.14);
    counterGroup.add(lid);

    const potHandle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 12, Math.PI), handleMat);
    potHandle.rotation.z = -Math.PI / 2;
    potHandle.position.set(cx + 0.11, 1.24, 0.14);
    counterGroup.add(potHandle);
  }

  // Glass pastry dome with BoonGood cookies inside
  const pastryBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 18), marbleTopMat);
  pastryBase.position.set(1.14, 1.12, 0.12);
  counterGroup.add(pastryBase);

  for (const [bx, bz] of [
    [1.06, 0.08],
    [1.22, 0.1],
    [1.14, 0.2],
  ]) {
    const cookie = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#c48348', roughness: 0.78 })
    );
    cookie.scale.set(1.0, 0.58, 1.0);
    cookie.position.set(bx, 1.17, bz);
    counterGroup.add(cookie);
  }
  const glassDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.1 })
  );
  glassDome.position.set(1.14, 1.13, 0.12);
  counterGroup.add(glassDome);

  // Two cozy bar stools in front of counter
  for (const sx of [-0.75, 0.75]) {
    const stool = new THREE.Group();
    stool.position.set(sx, 0, 0.85);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 10), counterWoodMat);
    pole.position.y = 0.31;
    stool.add(pole);
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.22, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: '#c95c38', roughness: 0.75 })
    );
    seat.position.y = 0.64;
    stool.add(seat);
    counterGroup.add(stool);
  }

  tagZone(counterGroup, 'coffee_counter');
  root.add(counterGroup);

  // --- 6. CHICK & DUCK CORNER + PAT THE DOG + MAGNA DOODLE ---
  const petGroup = new THREE.Group();
  petGroup.position.set(...ZONE_DEFINITIONS.chick_duck_corner.position);

  // Cozy round woven pet mat with terracotta border
  const petMat = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.02, 0.022, 24),
    new THREE.MeshStandardMaterial({ color: '#e8d7be', roughness: 0.92 })
  );
  petMat.position.y = 0.011;
  petMat.receiveShadow = true;
  petGroup.add(petMat);

  // Animated Mini Chick (cute fluffy golden yellow chick!)
  const chick = new THREE.Group();
  chick.position.set(-0.22, 0.17, 0.25);
  chick.scale.setScalar(1.22);
  const chickYellow = new THREE.MeshStandardMaterial({ color: '#f7d046', roughness: 0.65 });
  const beakOrange = new THREE.MeshStandardMaterial({ color: '#eb7d2d', roughness: 0.45 });
  const darkEye = new THREE.MeshStandardMaterial({ color: '#1a1615', roughness: 0.25 });

  const chickBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), chickYellow);
  chickBody.scale.set(1.0, 0.92, 1.15);
  chickBody.castShadow = true;
  chick.add(chickBody);

  for (const wx of [-0.125, 0.125]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), chickYellow);
    wing.scale.set(0.42, 0.75, 1.15);
    wing.position.set(wx, 0.01, -0.01);
    chick.add(wing);
  }

  const chickHead = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), chickYellow);
  chickHead.position.set(0, 0.12, 0.07);
  chick.add(chickHead);

  const chickBeak = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.07, 8), beakOrange);
  chickBeak.rotation.x = Math.PI / 2;
  chickBeak.position.set(0, 0.11, 0.17);
  chick.add(chickBeak);

  for (const ex of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), darkEye);
    eye.position.set(ex, 0.14, 0.145);
    chick.add(eye);
  }
  petGroup.add(chick);

  // Animated Mini Duck (plump snow-white duck with orange bill!)
  const duck = new THREE.Group();
  duck.position.set(0.28, 0.2, -0.1);
  duck.scale.setScalar(1.18);
  const duckWhite = new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.62 });

  const duckBody = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 12), duckWhite);
  duckBody.scale.set(0.95, 0.85, 1.28);
  duckBody.castShadow = true;
  duck.add(duckBody);

  for (const wx of [-0.155, 0.155]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), duckWhite);
    wing.scale.set(0.38, 0.72, 1.25);
    wing.position.set(wx, 0.02, -0.02);
    duck.add(wing);
  }

  const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), duckWhite);
  duckHead.position.set(0, 0.17, 0.1);
  duck.add(duckHead);

  const duckBill = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.036, 0.12), beakOrange);
  duckBill.position.set(0, 0.15, 0.215);
  duck.add(duckBill);

  for (const ex of [-0.052, 0.052]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), darkEye);
    eye.position.set(ex, 0.19, 0.185);
    duck.add(eye);
  }
  petGroup.add(duck);

  // Iconic White Ceramic Dog Statue — Pat the Dog!
  const patDog = new THREE.Group();
  patDog.position.set(-0.68, 0, -0.58);
  patDog.rotation.y = 0.68;
  const ceramicWhite = new THREE.MeshStandardMaterial({ color: '#faf7f2', roughness: 0.2, metalness: 0.06 });

  const dogPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.56), ceramicWhite);
  dogPlinth.position.set(0.04, 0.03, 0.04);
  patDog.add(dogPlinth);

  const dogBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 14), ceramicWhite);
  dogBody.rotation.z = 0.35;
  dogBody.position.set(-0.02, 0.34, 0);
  dogBody.castShadow = true;
  patDog.add(dogBody);

  // Sitting front legs
  for (const px of [-0.07, 0.07]) {
    const pawLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.24, 6, 10), ceramicWhite);
    pawLeg.position.set(0.14, 0.2, px);
    patDog.add(pawLeg);
  }

  // Subtle gold ceramic collar
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.02, 8, 16),
    new THREE.MeshStandardMaterial({ color: '#c48f45', roughness: 0.35, metalness: 0.5 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0.08, 0.48, 0);
  patDog.add(collar);

  const dogHead = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), ceramicWhite);
  dogHead.scale.set(1.28, 0.88, 0.88);
  dogHead.position.set(0.16, 0.6, 0);
  patDog.add(dogHead);

  const dogNose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), darkEye);
  dogNose.position.set(0.32, 0.6, 0);
  patDog.add(dogNose);

  for (const ez of [-0.095, 0.095]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.11, 6, 8), ceramicWhite);
    ear.position.set(0.1, 0.58, ez);
    patDog.add(ear);
  }
  petGroup.add(patDog);

  // Iconic Magna Doodle magnetic drawing board mounted on the left wall!
  const magnaBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.68, 0.92),
    new THREE.MeshStandardMaterial({ color: '#e65c4f', roughness: 0.5 })
  );
  magnaBoard.position.set(-1.62, 1.85, 0);
  petGroup.add(magnaBoard);

  const magnaScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.5),
    new THREE.MeshBasicMaterial({
      map: makeTextPlate('BOONGOOD!', {
        width: 256,
        height: 160,
        bg: '#e8e5dc',
        fg: '#45433e',
        border: '#99958c',
        fontSize: 34,
        subText: '♥ CHICK & DUCK ♥',
      }),
    })
  );
  magnaScreen.rotation.y = Math.PI / 2;
  magnaScreen.position.set(-1.585, 1.85, 0);
  petGroup.add(magnaScreen);

  tagZone(petGroup, 'chick_duck_corner');
  root.add(petGroup);

  // Subtle closet rattle state triggered when user clicks monica_secret_closet
  let closetRattleTime = 0;

  return {
    group: root,
    triggerClosetRattle() {
      closetRattleTime = 0.85;
    },
    update(dt, elapsed) {
      // 1. Chick & Duck adorable autonomous waddling & pecking around their cozy corner
      const cAngle = elapsed * 0.65;
      chick.position.x = -0.15 + Math.cos(cAngle) * 0.24;
      chick.position.z = 0.2 + Math.sin(cAngle) * 0.2;
      chick.position.y = 0.13 + Math.abs(Math.sin(elapsed * 7.5)) * 0.035;
      chick.rotation.y = -cAngle + Math.PI / 2;
      chick.rotation.z = Math.sin(elapsed * 7.5) * 0.1;

      const dAngle = -elapsed * 0.48 + 1.2;
      duck.position.x = 0.22 + Math.cos(dAngle) * 0.26;
      duck.position.z = -0.12 + Math.sin(dAngle) * 0.22;
      duck.position.y = 0.16 + Math.abs(Math.sin(elapsed * 5.2)) * 0.025;
      duck.rotation.y = -dAngle - Math.PI / 2;
      duck.rotation.z = Math.sin(elapsed * 5.2) * 0.08;

      // 2. Monica's secret closet door rattle animation when clicked
      if (closetRattleTime > 0) {
        closetRattleTime = Math.max(0, closetRattleTime - dt);
        closetDoorPivot.rotation.y = Math.sin(closetRattleTime * 34) * 0.09 * (closetRattleTime / 0.85);
      } else {
        closetDoorPivot.rotation.y *= 0.85;
      }
    },
  };
}
