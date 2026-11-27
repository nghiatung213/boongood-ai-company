import * as THREE from 'three';
import { OFFICE_BOUNDS } from './OfficeLayout.js';

function createWoodFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfa47b';
  ctx.fillRect(0, 0, 512, 512);

  // Warm honey-oak plank pattern
  const plankH = 32;
  const tones = ['#d2a87f', '#c79a70', '#d8b28a', '#c29368', '#cfa37a'];
  for (let row = 0; row < 512 / plankH; row += 1) {
    const y = row * plankH;
    const offset = (row % 2) * 128;
    for (let col = -1; col < 3; col += 1) {
      const x = col * 256 + offset;
      ctx.fillStyle = tones[(row * 3 + col + 4) % tones.length];
      ctx.fillRect(x, y, 254, plankH - 2);

      // Subtle wood grain lines
      ctx.strokeStyle = 'rgba(110, 72, 42, 0.14)';
      ctx.lineWidth = 1;
      for (let g = 6; g < plankH - 4; g += 7) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + g);
        ctx.bezierCurveTo(x + 80, y + g + 2, x + 170, y + g - 2, x + 250, y + g);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(84, 52, 28, 0.24)';
    ctx.fillRect(0, y + plankH - 2, 512, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4.5, 3.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBrickWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Warm mortar base
  ctx.fillStyle = '#c8b4a0';
  ctx.fillRect(0, 0, 256, 256);

  const brickColors = ['#a6523b', '#984733', '#b35c43', '#8c3f2d', '#a95840'];
  const bh = 24;
  const bw = 60;
  for (let row = 0; row < 12; row += 1) {
    const y = row * (bh + 4);
    const shift = (row % 2) * 32;
    for (let col = -1; col < 5; col += 1) {
      const x = col * (bw + 4) + shift;
      ctx.fillStyle = brickColors[(row * 5 + col + 7) % brickColors.length];
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = 'rgba(255, 232, 210, 0.08)';
      ctx.fillRect(x, y, bw, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.2, 1.8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCafeSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Deep forest-green Central Perk sign board with gold trim
  ctx.fillStyle = '#1f4a3a';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 24);
  ctx.fill();

  ctx.strokeStyle = '#e8c166';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.fillStyle = '#fdf4e1';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CENTRAL PERK', 256, 72);

  ctx.fillStyle = '#f2b85c';
  ctx.font = '600 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText('×  BOONGOOD STUDIO  ×', 256, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyCanvasTexture(mode) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);

  if (mode === 'evening') {
    grad.addColorStop(0, '#1e1b3a');
    grad.addColorStop(0.55, '#463059');
    grad.addColorStop(1, '#c7704c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Twinkling stars + warm NYC apartment silhouette
    ctx.fillStyle = '#fff5cf';
    for (const [sx, sy, sr] of [
      [34, 34, 2.2],
      [92, 22, 1.8],
      [152, 46, 2.5],
      [212, 28, 2.0],
      [184, 78, 1.6],
      [62, 72, 1.5],
    ]) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Distant NYC warm lit windows
    ctx.fillStyle = '#251e34';
    ctx.fillRect(0, 152, 74, 104);
    ctx.fillRect(80, 132, 92, 124);
    ctx.fillRect(178, 160, 78, 96);
    ctx.fillStyle = '#ffd57e';
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if ((r + c) % 2 === 0) ctx.fillRect(12 + c * 20, 164 + r * 20, 10, 12);
        if ((r + c) % 3 !== 1) ctx.fillRect(92 + c * 26, 146 + r * 22, 12, 14);
        if ((r + c) % 2 === 1) ctx.fillRect(188 + c * 22, 172 + r * 20, 10, 12);
      }
    }
  } else {
    grad.addColorStop(0, '#8cc8eb');
    grad.addColorStop(0.65, '#d6ecf7');
    grad.addColorStop(1, '#fff3dc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Soft sunny clouds & Greenwich Village skyline silhouette
    ctx.fillStyle = 'rgba(255, 253, 248, 0.85)';
    for (const [cx, cy, cr] of [
      [58, 62, 22],
      [80, 58, 26],
      [104, 64, 20],
      [184, 84, 20],
      [206, 80, 24],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d4b8a6';
    ctx.fillRect(0, 168, 72, 88);
    ctx.fillRect(82, 150, 90, 106);
    ctx.fillRect(180, 174, 76, 82);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the architectural diorama shell:
 * - Warm oak plank floor + exterior diorama slab
 * - Left & Back-Left lavender walls (Monica's Apartment #20)
 * - Back-Right exposed warm brick wall (Central Perk corner + hanging sign)
 * - Large framed NYC window (switches Day sky <-> Evening starry skyline)
 * - Warm wall sconces that glow softly in Evening Chill mode
 */
export function buildRoomShell() {
  const group = new THREE.Group();
  group.name = 'room_shell';

  const { width, depth, halfW, halfD, wallHeight } = OFFICE_BOUNDS;

  // 1. Thick cozy diorama base plinth + honey-oak wood floor
  const baseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.6, 0.36, depth + 0.6),
    new THREE.MeshStandardMaterial({ color: '#5c4132', roughness: 0.85 })
  );
  baseSlab.position.y = -0.19;
  baseSlab.receiveShadow = true;
  group.add(baseSlab);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      map: createWoodFloorTexture(),
      roughness: 0.78,
      metalness: 0.02,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0;
  floor.receiveShadow = true;
  group.add(floor);

  const monicaWallMat = new THREE.MeshStandardMaterial({
    color: '#9c86b5', // Iconic warm Monica lavender-purple!
    roughness: 0.86,
  });
  const brickWallMat = new THREE.MeshStandardMaterial({
    map: createBrickWallTexture(),
    roughness: 0.88,
  });
  const trimWhiteMat = new THREE.MeshStandardMaterial({
    color: '#f7f0e6',
    roughness: 0.65,
  });
  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: '#6e4934',
    roughness: 0.68,
  });

  // 2. Back Wall Left Segment (Monica's Purple Apartment Zone: X = -8.2 to +2.0)
  const backLeftW = 10.2;
  const backLeftWall = new THREE.Mesh(
    new THREE.BoxGeometry(backLeftW, wallHeight, 0.24),
    monicaWallMat
  );
  backLeftWall.position.set(-halfW + backLeftW / 2, wallHeight / 2, -halfD);
  backLeftWall.receiveShadow = true;
  group.add(backLeftWall);

  // Back Wall Right Segment (Central Perk Brick Café Zone: X = +2.0 to +8.2)
  const backRightW = width - backLeftW;
  const backRightWall = new THREE.Mesh(
    new THREE.BoxGeometry(backRightW, wallHeight, 0.24),
    brickWallMat
  );
  backRightWall.position.set(-halfW + backLeftW + backRightW / 2, wallHeight / 2, -halfD);
  backRightWall.receiveShadow = true;
  group.add(backRightWall);

  // Vertical wooden divider pilaster between Monica's apartment & Central Perk brick!
  const dividerPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, wallHeight + 0.06, 0.34),
    woodTrimMat
  );
  dividerPost.position.set(-halfW + backLeftW, wallHeight / 2, -halfD + 0.05);
  dividerPost.castShadow = true;
  group.add(dividerPost);

  // 3. Left Wall (Monica's Lavender + white wainscoting trim)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, wallHeight, depth),
    monicaWallMat
  );
  leftWall.position.set(-halfW, wallHeight / 2, 0);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // 4. Right Cutaway Low Half-Wall (Brick café waist-high wall so camera never gets blocked)
  const rightLowWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.05, depth),
    brickWallMat
  );
  rightLowWall.position.set(halfW, 0.525, 0);
  rightLowWall.receiveShadow = true;
  group.add(rightLowWall);

  const rightCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.09, depth + 0.1),
    woodTrimMat
  );
  rightCap.position.set(halfW, 1.08, 0);
  group.add(rightCap);

  // Crisp baseboards & crown molding on Left & Back walls
  const backBaseboard = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.2, 0.06),
    trimWhiteMat
  );
  backBaseboard.position.set(0, 0.1, -halfD + 0.13);
  group.add(backBaseboard);

  const leftBaseboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.2, depth),
    trimWhiteMat
  );
  leftBaseboard.position.set(-halfW + 0.13, 0.1, 0);
  group.add(leftBaseboard);

  const backCrown = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.1, 0.16, 0.14),
    trimWhiteMat
  );
  backCrown.position.set(0, wallHeight - 0.04, -halfD + 0.12);
  group.add(backCrown);

  // 5. Large NYC Framed Window on Back Wall (X = -0.1, Y = 2.45)
  const winGroup = new THREE.Group();
  winGroup.position.set(-0.05, 2.45, -halfD + 0.13);

  const daySkyTex = createSkyCanvasTexture('day');
  const eveningSkyTex = createSkyCanvasTexture('evening');
  const windowGlassMat = new THREE.MeshStandardMaterial({
    map: daySkyTex,
    emissive: '#ffffff',
    emissiveMap: daySkyTex,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 2.15), windowGlassMat);
  winGroup.add(glassPane);

  // Window mullions & sill
  const frameBorders = [
    [2.85, 0.12, 0.12, 0, 1.1, 0.04],
    [2.95, 0.14, 0.2, 0, -1.12, 0.08],
    [0.12, 2.25, 0.12, -1.36, 0, 0.04],
    [0.12, 2.25, 0.12, 1.36, 0, 0.04],
    [0.07, 2.18, 0.07, 0, 0, 0.04],
    [2.68, 0.07, 0.07, 0, 0.08, 0.04],
  ];
  for (const [fw, fh, fd, fx, fy, fz] of frameBorders) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), trimWhiteMat);
    bar.position.set(fx, fy, fz);
    winGroup.add(bar);
  }

  // Cute potted herbs on Monica's window sill
  for (const px of [-0.85, 0.78]) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.08, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: '#c46c47', roughness: 0.75 })
    );
    pot.position.set(px, -0.97, 0.12);
    winGroup.add(pot);
    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: '#588c5c', roughness: 0.75 })
    );
    foliage.position.set(px, -0.83, 0.12);
    winGroup.add(foliage);
  }
  group.add(winGroup);

  // 6. Central Perk × BoonGood café sign mounted on brick wall
  const signMat = new THREE.MeshStandardMaterial({
    map: createCafeSignTexture(),
    emissive: '#f5cb78',
    emissiveMap: createCafeSignTexture(),
    emissiveIntensity: 0.12,
    roughness: 0.4,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.9, 0.09), signMat);
  signBoard.position.set(5.1, 3.35, -halfD + 0.16);
  signBoard.castShadow = true;
  group.add(signBoard);

  // 7. Cozy Warm Wall Sconces (glow richly in Evening Chill mode!)
  const bulbMaterials = [];
  const eveningPointLights = [];
  const sconcePositions = [
    [-4.55, 2.85, -halfD + 0.2],
    [3.1, 2.85, -halfD + 0.2],
    [7.15, 2.85, -halfD + 0.2],
    [-halfW + 0.2, 2.85, -0.8],
  ];

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#c99c52',
    roughness: 0.35,
    metalness: 0.65,
  });

  sconcePositions.forEach(([sx, sy, sz], idx) => {
    const sconce = new THREE.Group();
    sconce.position.set(sx, sy, sz);
    if (idx === 3) sconce.rotation.y = Math.PI / 2;

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), brassMat);
    plate.rotation.x = Math.PI / 2;
    sconce.add(plate);

    const shadeMat = new THREE.MeshStandardMaterial({
      color: '#ffedd2',
      emissive: '#ffaa44',
      emissiveIntensity: 0.18,
      roughness: 0.35,
    });
    bulbMaterials.push(shadeMat);

    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), shadeMat);
    shade.scale.set(1.0, 1.2, 0.85);
    shade.position.set(0, 0.06, 0.12);
    sconce.add(shade);

    group.add(sconce);

    // Add warm point lights on apartment & cafe walls for evening ambiance
    if (idx === 0 || idx === 1) {
      const pt = new THREE.PointLight('#ff9f43', 0, 12, 1.45);
      pt.position.set(sx, sy - 0.1, sz + 0.75);
      group.add(pt);
      eveningPointLights.push(pt);
    }
  });

  // Extra warm amber glow above Central Perk orange sofa in Evening Chill mode
  const loungeLampLight = new THREE.PointLight('#ffad52', 0, 10, 1.5);
  loungeLampLight.position.set(1.5, 2.7, -0.8);
  group.add(loungeLampLight);
  eveningPointLights.push(loungeLampLight);

  // 8. Decorative potted fiddle-leaf fig in back-left corner
  const cornerPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.24, 0.46, 16),
    new THREE.MeshStandardMaterial({ color: '#d8c3ab', roughness: 0.75 })
  );
  cornerPot.position.set(-7.55, 0.23, -5.3);
  cornerPot.castShadow = true;
  group.add(cornerPot);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, 1.05, 10),
    woodTrimMat
  );
  trunk.position.set(-7.55, 0.82, -5.3);
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: '#457a4e', roughness: 0.7 });
  for (const [lx, ly, lz, lr] of [
    [-7.55, 1.48, -5.3, 0.36],
    [-7.32, 1.28, -5.12, 0.28],
    [-7.74, 1.32, -5.18, 0.26],
  ]) {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(lr, 1), leafMat);
    leaf.position.set(lx, ly, lz);
    leaf.castShadow = true;
    group.add(leaf);
  }

  return {
    group,
    setLightingMode(mode) {
      const isEvening = mode === 'evening';
      windowGlassMat.map = isEvening ? eveningSkyTex : daySkyTex;
      windowGlassMat.emissiveMap = isEvening ? eveningSkyTex : daySkyTex;
      windowGlassMat.emissiveIntensity = isEvening ? 0.92 : 0.42;
      windowGlassMat.needsUpdate = true;

      signMat.emissiveIntensity = isEvening ? 0.72 : 0.12;
      for (const bm of bulbMaterials) {
        bm.emissiveIntensity = isEvening ? 1.55 : 0.18;
      }
      for (const pt of eveningPointLights) {
        pt.intensity = isEvening ? 3.2 : 0;
      }
    },
  };
}
