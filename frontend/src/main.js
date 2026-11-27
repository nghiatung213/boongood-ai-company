import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';

import * as THREE from 'three';
import { SceneManager } from './3d/SceneManager.js';
import { EmoteParticles } from './3d/EmoteParticles.js';
import { CHARACTER_META, CHARACTER_ORDER } from './3d/characters/CharacterMeta.js';
import { createCharacter } from './3d/characters/CharacterFactory.js';
import { StudioInspectController } from './3d/StudioInspectController.js';
import { TopToolbar } from './ui/TopToolbar.js';
import { StudioPanel } from './ui/StudioPanel.js';

function bootstrapMilestone1() {
  const canvasContainer = document.getElementById('canvas-container');
  const bubbleLayer = document.getElementById('bubble-layer');
  const topToolbarEl = document.getElementById('top-toolbar');
  const dockEl = document.getElementById('character-dock');
  const studioPanelEl = document.getElementById('studio-panel');

  const sceneManager = new SceneManager(canvasContainer);
  const emotes = new EmoteParticles(sceneManager.scene);

  // Build all 6 Vinyl Chibi Friends characters
  const characters = new Map();
  const nameTagEls = new Map();

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

  // Hide character dock in Studio Mode (studio panel has full 6-character selector)
  dockEl.classList.add('hidden');

  // Studio Inspect Mode (active by default for Milestone 1 visual review)
  const studioController = new StudioInspectController({
    sceneManager,
    characters,
    emotes,
  });

  const studioPanel = new StudioPanel(studioPanelEl, studioController);

  // Cancel camera glide if user grabs OrbitControls manually
  sceneManager.controls.addEventListener('start', () => {
    sceneManager.cancelCameraGlide();
  });

  const toolbar = new TopToolbar(topToolbarEl, {
    onToggleLighting: () => {
      const next = sceneManager.lightingMode === 'day' ? 'evening' : 'day';
      sceneManager.setLightingMode(next);
      toolbar.setState({ lightingMode: next });
    },
    onToggleStudio: () => {
      if (studioPanel.visible) {
        studioPanel.hide();
        toolbar.setState({ studioActive: false });
      } else {
        studioPanel.show();
        toolbar.setState({ studioActive: true });
      }
    },
  });

  // Start in Lineup view so all 6 characters are showcased immediately
  studioController.enter('lineup', true);
  studioPanel.show();
  toolbar.setState({ lightingMode: 'day', studioActive: true });

  // Raycast click on any character to smoothly zoom into Portrait Close-Up
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
    if (dist > 7) return; // Ignore orbit drags

    const rect = canvasContainer.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, sceneManager.camera);
    const hits = raycaster.intersectObjects(
      Array.from(characters.values()).map((r) => r.root),
      true
    );
    const hitChar = hits.find((h) => h.object.userData?.characterId);
    if (hitChar) {
      const id = hitChar.object.userData.characterId;
      studioController.selectCharacter(id, true);
      studioPanel.show();
      studioPanel.render();
      toolbar.setState({ studioActive: true });
    }
  });

  // Expose lightweight debug hook for automated visual verification
  window.__BOONGOOD_STUDIO__ = {
    sceneManager,
    characters,
    studioController,
    studioPanel,
  };

  // Main 60fps animation loop with visibility pause guard
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

    for (const [id, rig] of characters.entries()) {
      rig.update(dt);

      const tag = nameTagEls.get(id);
      if (tag) {
        if (studioController.viewMode === 'portrait') {
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

bootstrapMilestone1();
