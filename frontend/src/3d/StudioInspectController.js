import * as THREE from 'three';
import { CHARACTER_ORDER } from './characters/CharacterMeta.js';

/**
 * Controls Studio Inspect Mode:
 * - 'lineup': Places all 6 Friends characters cleanly side-by-side for side-by-side visual sign-off.
 * - 'portrait': Glides camera right up to a selected character's face & bust with 360° free orbit.
 * - Lets user trigger all 12 face_expressions, 10 body_gestures, lip-sync talk, blink, and walk cycle.
 */
export class StudioInspectController {
  constructor({ sceneManager, characters, emotes }) {
    this.sceneManager = sceneManager;
    this.characters = characters; // Map<id, AgentRig>
    this.emotes = emotes;

    this.active = false;
    this.viewMode = 'lineup'; // 'lineup' | 'portrait'
    this.selectedId = 'rachel';
    this.currentExpression = 'neutral';
    this.currentGesture = 'idle_talk';
    this.isSpeaking = false;
    this.isWalking = false;

    this._savedTransforms = new Map();
  }

  enter(initialView = 'lineup', instantCamera = false) {
    if (!this.active) {
      this._savedTransforms.clear();
      for (const [id, rig] of this.characters.entries()) {
        this._savedTransforms.set(id, {
          pos: rig.root.position.clone(),
          rotY: rig.root.rotation.y,
        });
      }
    }

    this.active = true;
    this.sceneManager.setStudioStageVisible(true);
    this._arrangeLineup();
    this.setViewMode(initialView, instantCamera);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    for (const [id, rig] of this.characters.entries()) {
      const saved = this._savedTransforms.get(id);
      if (saved) {
        rig.root.position.copy(saved.pos);
        rig.setTargetYaw(saved.rotY);
      }
      rig.setSelected(false);
      rig.setSpeaking(false);
      rig.setWalking(false);
      rig.setExpression('neutral');
      rig.setGesture('idle_talk');
    }
  }

  _arrangeLineup() {
    const spacing = 1.24;
    const startX = -((CHARACTER_ORDER.length - 1) * spacing) / 2;
    CHARACTER_ORDER.forEach((id, idx) => {
      const rig = this.characters.get(id);
      if (!rig) return;
      rig.root.position.set(startX + idx * spacing, 0, 0);
      rig.root.rotation.set(0, 0, 0);
      rig.setTargetYaw(0);
    });
  }

  setViewMode(viewMode, instant = false) {
    this.viewMode = viewMode === 'portrait' ? 'portrait' : 'lineup';

    if (this.viewMode === 'lineup') {
      for (const [id, rig] of this.characters.entries()) {
        rig.setSelected(id === this.selectedId);
      }
      const isNarrow = window.innerWidth < 760;
      const offsetX = isNarrow ? 0 : 1.15;
      this.sceneManager.focusCamera(
        new THREE.Vector3(offsetX, isNarrow ? 2.4 : 1.85, isNarrow ? 12.2 : 9.8),
        new THREE.Vector3(offsetX, 0.88, 0),
        instant
      );
    } else {
      this._focusPortrait(this.selectedId, instant);
    }
  }

  selectCharacter(characterId, switchToPortrait = false) {
    if (!this.characters.has(characterId)) return;
    this.selectedId = characterId;

    for (const [id, rig] of this.characters.entries()) {
      rig.setSelected(id === characterId);
    }

    if (switchToPortrait) {
      this.viewMode = 'portrait';
    }

    if (this.viewMode === 'portrait') {
      this._focusPortrait(characterId, false);
    }
  }

  _focusPortrait(characterId, instant) {
    const rig = this.characters.get(characterId);
    if (!rig) return;
    const p = rig.root.position;
    const isNarrow = window.innerWidth < 760;
    const offsetX = isNarrow ? 0 : 0.34;
    const offsetY = isNarrow ? 0.75 : 1.02;
    this.sceneManager.focusCamera(
      new THREE.Vector3(p.x + offsetX, offsetY + 0.16, p.z + (isNarrow ? 3.1 : 2.55)),
      new THREE.Vector3(p.x + offsetX, offsetY, p.z),
      instant
    );
  }

  applyExpression(expression) {
    this.currentExpression = expression;
    const targets = this._getTargets();
    for (const rig of targets) {
      rig.setExpression(expression);
      if (this.emotes) {
        this.emotes.burstForExpression(rig.getWorldHeadTop(), expression);
      }
    }
  }

  applyGesture(gesture) {
    this.currentGesture = gesture;
    if (this.isWalking) {
      this.isWalking = false;
    }
    const targets = this._getTargets();
    for (const rig of targets) {
      rig.setWalking(false);
      rig.setGesture(gesture);
    }
  }

  toggleSpeaking() {
    this.isSpeaking = !this.isSpeaking;
    for (const rig of this._getTargets()) {
      rig.setSpeaking(this.isSpeaking);
    }
    return this.isSpeaking;
  }

  toggleWalking() {
    this.isWalking = !this.isWalking;
    for (const rig of this._getTargets()) {
      rig.setWalking(this.isWalking, 1.0);
    }
    return this.isWalking;
  }

  triggerBlink() {
    for (const rig of this._getTargets()) {
      rig.triggerBlink();
    }
  }

  _getTargets() {
    if (this.viewMode === 'lineup') {
      return Array.from(this.characters.values());
    }
    const rig = this.characters.get(this.selectedId);
    return rig ? [rig] : [];
  }
}
