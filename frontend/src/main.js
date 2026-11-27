import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';

import * as THREE from 'three';
import { SceneManager } from './3d/SceneManager.js';
import { EmoteParticles } from './3d/EmoteParticles.js';
import { CHARACTER_META, CHARACTER_ORDER } from './3d/characters/CharacterMeta.js';
import { createCharacter } from './3d/characters/CharacterFactory.js';
import { StudioInspectController } from './3d/StudioInspectController.js';
import { OfficeEnvironment } from './3d/environment/OfficeEnvironment.js';
import {
  CHARACTER_HOME_ZONE,
  ZONE_DEFINITIONS,
  getOfficeOverviewCamera,
} from './3d/environment/OfficeLayout.js';
import { TopToolbar } from './ui/TopToolbar.js';
import { CharacterDock } from './ui/CharacterDock.js';
import { StudioPanel } from './ui/StudioPanel.js';

function bootstrapApp() {
  const canvasContainer = document.getElementById('canvas-container');
  const bubbleLayer = document.getElementById('bubble-layer');
  const topToolbarEl = document.getElementById('top-toolbar');
  const dockEl = document.getElementById('character-dock');
  const studioPanelEl = document.getElementById('studio-panel');

  // Lightweight zone toast indicator
  const zoneToastEl = document.createElement('div');
  zoneToastEl.className = 'zone-toast';
  document.getElementById('app').appendChild(zoneToastEl);
  let zoneToastTimer = null;

  function showZoneToast(label) {
    zoneToastEl.textContent = label;
    zoneToastEl.classList.add('visible');
    if (zoneToastTimer) clearTimeout(zoneToastTimer);
    zoneToastTimer = setTimeout(() => {
      zoneToastEl.classList.remove('visible');
    }, 2600);
  }

  const sceneManager = new SceneManager(canvasContainer);
  const emotes = new EmoteParticles(sceneManager.scene);

  // Build 12-zone "Central Perk × Monica's Apartment" 3D Office
  const officeEnv = new OfficeEnvironment();
  sceneManager.scene.add(officeEnv.group);
  sceneManager.setStudioStageVisible(false);

  // Build all 6 Vinyl Chibi Friends characters & place them at their personal work desks
  const characters = new Map();
  const nameTagEls = new Map();

  function placeCharactersAtHomeDesks() {
    for (const id of CHARACTER_ORDER) {
      const rig = characters.get(id);
      const zoneDef = ZONE_DEFINITIONS[CHARACTER_HOME_ZONE[id]];
      if (!rig || !zoneDef) continue;
      rig.root.position.set(...zoneDef.standSpot);
      // Angle characters warmly toward the front-center so their adorable chibi faces
      // greet sếp Bông right away in the isometric overview!
      const yaw = Math.atan2(
        0 - zoneDef.standSpot[0] * 0.45,
        8.2 - zoneDef.standSpot[2]
      );
      rig.root.rotation.y = yaw;
      rig.setTargetYaw(yaw);
    }
  }

  for (const id of CHARACTER_ORDER) {
    const rig = createCharacter(id);
    characters.set(id, rig);
    sceneManager.scene.add(rig.root);

    const tag = document.createElement('div');
    tag.className = 'char-name-tag';
    tag.textContent = CHARACTER_META[id].name;
    bubbleLayer.appendChild(tag);
    nameTagEls.set(id, tag);
  }
  placeCharactersAtHomeDesks();

  // Studio Inspect Mode (accessible anytime via TopToolbar "🎭 Studio")
  const studioController = new StudioInspectController({
    sceneManager,
    characters,
    emotes,
  });
  const studioPanel = new StudioPanel(studioPanelEl, studioController);

  // Cancel smooth camera glide whenever user drags manually
  sceneManager.controls.addEventListener('start', () => {
    sceneManager.cancelCameraGlide();
  });

  function focusOfficeOverview(instant = false) {
    const isMobile = window.innerWidth < 760;
    const cam = getOfficeOverviewCamera(isMobile);
    sceneManager.focusCamera(cam.position, cam.target, instant);
    officeEnv.highlightZone(null);
    for (const rig of characters.values()) {
      rig.setSelected(false);
    }
    characterDock.setSelected(null);
  }

  function focusOfficeCharacter(characterId) {
    const rig = characters.get(characterId);
    if (!rig) return;
    for (const [id, r] of characters.entries()) {
      r.setSelected(id === characterId);
    }
    officeEnv.highlightZone(null);
    characterDock.setSelected(characterId);

    // Smooth camera focus gently in front of the selected character
    const pos = rig.root.position;
    const isMobile = window.innerWidth < 760;
    const dir = new THREE.Vector3(0 - pos.x, 0, 1.5 - pos.z).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);

    const camPos = new THREE.Vector3(
      pos.x + dir.x * (isMobile ? 4.2 : 3.4),
      pos.y + (isMobile ? 2.1 : 1.85),
      pos.z + dir.z * (isMobile ? 4.2 : 3.4)
    );
    const camTarget = new THREE.Vector3(pos.x, pos.y + 1.05, pos.z);
    rig.lookAtWorldPoint(camPos);
    sceneManager.focusCamera(camPos, camTarget, false);
    showZoneToast(`${CHARACTER_META[characterId].fullName} · ${CHARACTER_META[characterId].role}`);
  }

  function focusOfficeZone(zoneId) {
    const def = officeEnv.getZoneDefinition(zoneId);
    if (!def) return;
    officeEnv.highlightZone(zoneId);
    officeEnv.triggerZoneEffect(zoneId);
    for (const rig of characters.values()) {
      rig.setSelected(false);
    }
    characterDock.setSelected(null);

    const [zx, zy, zz] = def.position;
    const [ox, oy, oz] = def.cameraOffset;
    sceneManager.focusCamera(
      new THREE.Vector3(zx + ox, zy + oy, zz + oz),
      new THREE.Vector3(zx, zy + 0.9, zz),
      false
    );
    showZoneToast(`📍 ${def.label}`);
  }

  function enterStudioMode() {
    officeEnv.setVisible(false);
    officeEnv.highlightZone(null);
    characterDock.hide();
    studioController.enter('lineup', false);
    studioPanel.show();
    toolbar.setState({ studioActive: true });
    zoneToastEl.classList.remove('visible');
  }

  function exitStudioMode() {
    studioController.exit();
    studioPanel.hide();
    sceneManager.setStudioStageVisible(false);
    officeEnv.setVisible(true);
    characterDock.show();
    toolbar.setState({ studioActive: false });
    focusOfficeOverview(false);
  }

  const characterDock = new CharacterDock(dockEl, {
    onSelectCharacter: (id) => focusOfficeCharacter(id),
    onResetOverview: () => focusOfficeOverview(false),
  });

  const toolbar = new TopToolbar(topToolbarEl, {
    onToggleLighting: () => {
      const next = sceneManager.lightingMode === 'day' ? 'evening' : 'day';
      sceneManager.setLightingMode(next);
      officeEnv.setLightingMode(next);
      toolbar.setState({ lightingMode: next });
    },
    onToggleStudio: () => {
      if (studioController.active) {
        exitStudioMode();
      } else {
        enterStudioMode();
      }
    },
  });

  // Start in Isometric Living 3D Office view
  toolbar.setState({ lightingMode: 'day', studioActive: false });
  characterDock.show();
  focusOfficeOverview(true);

  // Raycast click picking for Characters & all 12 Office Zones
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownPos = null;

  canvasContainer.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  canvasContainer.addEventListener('pointerup', (e) => {
    if (!pointerDownPos) return;
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    pointerDownPos = null;
    if (dist > 7) return;

    const rect = canvasContainer.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, sceneManager.camera);

    // Priority 1: Characters
    const charHits = raycaster.intersectObjects(
      Array.from(characters.values()).map((r) => r.root),
      true
    );
    const hitChar = charHits.find((h) => h.object.userData?.characterId);
    if (hitChar) {
      const id = hitChar.object.userData.characterId;
      if (studioController.active) {
        studioController.selectCharacter(id, true);
        studioPanel.show();
        studioPanel.render();
      } else {
        focusOfficeCharacter(id);
      }
      return;
    }

    // Priority 2: 12 Office Zones (only when not in Studio Mode)
    if (!studioController.active) {
      const zoneHits = raycaster.intersectObjects(officeEnv.getRaycastTargets(), true);
      const hitZone = zoneHits.find((h) => h.object.userData?.zoneId);
      if (hitZone) {
        focusOfficeZone(hitZone.object.userData.zoneId);
      }
    }
  });

  // Debug & automated verification hook
  window.__BOONGOOD_APP__ = {
    sceneManager,
    officeEnv,
    characters,
    studioController,
    studioPanel,
    focusOfficeOverview,
    focusOfficeCharacter,
    focusOfficeZone,
    enterStudioMode,
    exitStudioMode,
  };

  // Main 60fps animation loop
  const projVec = new THREE.Vector3();
  let lastTime = performance.now();

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) {
      lastTime = now;
      return;
    }
    const dt = Math.max(0.001, Math.min((now - lastTime) / 1000, 0.08));
    lastTime = now;

    const width = canvasContainer.clientWidth || window.innerWidth;
    const height = canvasContainer.clientHeight || window.innerHeight;

    officeEnv.update(dt);

    for (const [id, rig] of characters.entries()) {
      rig.update(dt);

      const tag = nameTagEls.get(id);
      if (tag) {
        if (studioController.active && studioController.viewMode === 'portrait') {
          tag.style.display = 'none';
        } else {
          rig.getWorldHeadTop(projVec);
          projVec.project(sceneManager.camera);
          const visible = projVec.z < 1;
          tag.style.display = visible ? 'block' : 'none';
          if (visible) {
            tag.style.left = `${(projVec.x * 0.5 + 0.5) * width}px`;
            tag.style.top = `${(-projVec.y * 0.5 + 0.5) * height}px`;
          }
        }
      }
    }

    emotes.update(dt);
    sceneManager.update(dt);
  }

  requestAnimationFrame(tick);
}

bootstrapApp();
