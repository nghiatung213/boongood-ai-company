import * as THREE from 'three';

const STATE_RING_COLORS = {
  IDLE: null, // Uses character accentColor at low subtle opacity
  WORKING: '#d49428',
  COLLABORATING: '#4c8c62',
  WAITING_APPROVAL: '#d66236',
};

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Articulated Chibi Rig Controller.
 * Keeps motion logic cleanly decoupled from geometry so custom .glb rigs can plug in later
 * by implementing the same pivot socket contract.
 */
export class AgentRig {
  constructor({ meta, parts, faceManager, coffeeProp, guitarProp }) {
    this.id = meta.id;
    this.meta = meta;
    this.parts = parts;
    this.face = faceManager;
    this.coffeeProp = coffeeProp;
    this.guitarProp = guitarProp;

    this.root = parts.rootGroup;
    this.uiAnchor = parts.uiAnchor;

    this.state = 'IDLE'; // IDLE | WORKING | COLLABORATING | WAITING_APPROVAL
    this.gesture = 'idle_talk';
    this.isWalking = false;
    this.isSelected = false;
    this.walkSpeed = 1.0;

    this._time = Math.random() * 10;
    this._gestureTime = 0;
    this._targetYaw = 0;
    this._hasTargetYaw = false;
  }

  setExpression(expression) {
    this.face.setExpression(expression);
  }

  setSpeaking(speaking) {
    this.face.setSpeaking(speaking);
  }

  setGesture(gesture) {
    const next = gesture || 'idle_talk';
    if (this.gesture !== next) {
      this.gesture = next;
      this._gestureTime = 0;
    }
    this.coffeeProp.visible = next === 'sip_coffee';
    this.guitarProp.visible = next === 'play_guitar';
  }

  setWalking(walking, speed = 1.0) {
    this.isWalking = Boolean(walking);
    this.walkSpeed = speed;
  }

  setAgentState(state) {
    this.state = state || 'IDLE';
    const overrideColor = STATE_RING_COLORS[this.state] || this.meta.accentColor;
    this.parts.stateRingMat.color.set(overrideColor);
  }

  setSelected(selected) {
    this.isSelected = Boolean(selected);
  }

  lookAtWorldPoint(point) {
    const dx = point.x - this.root.position.x;
    const dz = point.z - this.root.position.z;
    if (dx * dx + dz * dz > 0.0001) {
      this._targetYaw = Math.atan2(dx, dz);
      this._hasTargetYaw = true;
    }
  }

  setTargetYaw(yaw) {
    this._targetYaw = yaw;
    this._hasTargetYaw = true;
  }

  triggerBlink() {
    this.face.triggerBlink();
  }

  getWorldHeadTop(target = new THREE.Vector3()) {
    return this.uiAnchor.getWorldPosition(target);
  }

  update(dt) {
    const safeDt = Math.min(dt, 0.08);
    this._time += safeDt;
    this._gestureTime += safeDt;

    // 1. Update Dynamic Canvas Face (auto-blink + lip-sync)
    this.face.update(safeDt);

    // 2. Smooth root yaw rotation
    if (this._hasTargetYaw) {
      let diff = this._targetYaw - this.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.root.rotation.y += diff * (1 - Math.exp(-9 * safeDt));
    }

    // 3. Status halo ring pulse
    const ringMat = this.parts.stateRingMat;
    if (this.isSelected) {
      ringMat.opacity = 0.72 + Math.sin(this._time * 4.5) * 0.14;
      const s = 1.08 + Math.sin(this._time * 4.5) * 0.04;
      this.parts.stateRing.scale.set(s, s, 1);
    } else if (this.state === 'WAITING_APPROVAL') {
      ringMat.opacity = 0.55 + Math.sin(this._time * 6.0) * 0.25;
      const s = 1.06 + Math.sin(this._time * 6.0) * 0.08;
      this.parts.stateRing.scale.set(s, s, 1);
    } else if (this.state === 'WORKING') {
      ringMat.opacity = 0.48 + Math.sin(this._time * 3.8) * 0.14;
      this.parts.stateRing.scale.set(1.03, 1.03, 1);
    } else {
      ringMat.opacity = 0.18;
      this.parts.stateRing.scale.set(1, 1, 1);
    }

    // 4. Compute pose targets from walk cycle + active body_gesture
    // Note: leftArm (-X) opens OUTWARD with negative Z; rightArm (+X) opens OUTWARD with positive Z
    const t = this._time;
    const gt = this._gestureTime;
    const pose = {
      bodyY: Math.sin(t * 2.2) * 0.012,
      bodyScaleY: 1,
      bodyScaleXZ: 1,
      torsoRotX: 0,
      torsoRotY: 0,
      torsoRotZ: 0,
      headRotX: Math.sin(t * 1.4) * 0.025,
      headRotY: Math.sin(t * 0.9) * 0.035,
      headRotZ: Math.sin(t * 1.1) * 0.02,
      lArmX: 0,
      lArmY: 0,
      lArmZ: -0.14,
      rArmX: 0,
      rArmY: 0,
      rArmZ: 0.14,
      lLegX: 0,
      rLegX: 0,
    };

    if (this.isWalking) {
      const w = t * 7.8 * this.walkSpeed;
      const swing = Math.sin(w);
      pose.bodyY = Math.abs(Math.sin(w)) * 0.055;
      pose.torsoRotX = 0.06;
      pose.torsoRotZ = swing * 0.045;
      pose.headRotZ = -swing * 0.03;
      pose.lLegX = swing * 0.62;
      pose.rLegX = -swing * 0.62;
      pose.lArmX = -swing * 0.52;
      pose.rArmX = swing * 0.52;
      pose.lArmZ = -0.16;
      pose.rArmZ = 0.16;
    } else {
      this._applyGesturePose(pose, this.gesture, gt);
    }

    // 5. Damped smooth interpolation onto articulated joints
    const k = 12;
    const { bodyPivot, torsoGroup, headPivot, leftArm, rightArm, leftLeg, rightLeg } = this.parts;

    bodyPivot.position.y = damp(bodyPivot.position.y, pose.bodyY, k, safeDt);
    bodyPivot.scale.y = damp(bodyPivot.scale.y, pose.bodyScaleY, k, safeDt);
    bodyPivot.scale.x = damp(bodyPivot.scale.x, pose.bodyScaleXZ, k, safeDt);
    bodyPivot.scale.z = damp(bodyPivot.scale.z, pose.bodyScaleXZ, k, safeDt);

    torsoGroup.rotation.x = damp(torsoGroup.rotation.x, pose.torsoRotX, k, safeDt);
    torsoGroup.rotation.y = damp(torsoGroup.rotation.y, pose.torsoRotY, k, safeDt);
    torsoGroup.rotation.z = damp(torsoGroup.rotation.z, pose.torsoRotZ, k, safeDt);

    headPivot.rotation.x = damp(headPivot.rotation.x, pose.headRotX, k, safeDt);
    headPivot.rotation.y = damp(headPivot.rotation.y, pose.headRotY, k, safeDt);
    headPivot.rotation.z = damp(headPivot.rotation.z, pose.headRotZ, k, safeDt);

    leftArm.armPivot.rotation.x = damp(leftArm.armPivot.rotation.x, pose.lArmX, k, safeDt);
    leftArm.armPivot.rotation.y = damp(leftArm.armPivot.rotation.y, pose.lArmY, k, safeDt);
    leftArm.armPivot.rotation.z = damp(leftArm.armPivot.rotation.z, pose.lArmZ, k, safeDt);

    rightArm.armPivot.rotation.x = damp(rightArm.armPivot.rotation.x, pose.rArmX, k, safeDt);
    rightArm.armPivot.rotation.y = damp(rightArm.armPivot.rotation.y, pose.rArmY, k, safeDt);
    rightArm.armPivot.rotation.z = damp(rightArm.armPivot.rotation.z, pose.rArmZ, k, safeDt);

    leftLeg.legPivot.rotation.x = damp(leftLeg.legPivot.rotation.x, pose.lLegX, k, safeDt);
    rightLeg.legPivot.rotation.x = damp(rightLeg.legPivot.rotation.x, pose.rLegX, k, safeDt);
  }

  _applyGesturePose(pose, gesture, gt) {
    if (gesture === 'idle_talk') {
      const talkAmp = this.face.isSpeaking ? 1.0 : 0.35;
      pose.headRotX = Math.sin(gt * 4.2) * 0.05 * talkAmp;
      pose.lArmX = -0.14 - Math.sin(gt * 3.6) * 0.14 * talkAmp;
      pose.rArmX = -0.18 - Math.cos(gt * 3.6) * 0.16 * talkAmp;
      pose.lArmZ = -0.15;
      pose.rArmZ = 0.15;
    } else if (gesture === 'point') {
      pose.torsoRotY = -0.14;
      pose.headRotY = 0.12;
      pose.rArmX = -1.32 + Math.sin(gt * 6.5) * 0.08;
      pose.rArmZ = 0.08;
      pose.lArmX = -0.12;
      pose.lArmZ = -0.16;
    } else if (gesture === 'shrug') {
      const lift = 0.5 + 0.5 * Math.sin(gt * 3.2);
      pose.bodyY += lift * 0.025;
      pose.headRotZ = 0.14 * Math.sin(gt * 2.2);
      pose.headRotX = -0.05;
      pose.lArmX = -0.68;
      pose.rArmX = -0.68;
      pose.lArmZ = -0.78 - lift * 0.14;
      pose.rArmZ = 0.78 + lift * 0.14;
    } else if (gesture === 'excited_bounce') {
      const hop = Math.abs(Math.sin(gt * 6.2));
      pose.bodyY = hop * 0.17;
      pose.bodyScaleY = 0.94 + hop * 0.1;
      pose.bodyScaleXZ = 1.04 - hop * 0.05;
      pose.lArmX = -2.35 + Math.sin(gt * 8.0) * 0.18;
      pose.rArmX = -2.35 - Math.sin(gt * 8.0) * 0.18;
      pose.lArmZ = -0.35;
      pose.rArmZ = 0.35;
      pose.headRotX = -0.08;
    } else if (gesture === 'lean_in') {
      pose.torsoRotX = 0.22;
      pose.headRotX = -0.12;
      pose.headRotZ = 0.08 * Math.sin(gt * 2.1);
      pose.lArmX = -0.35;
      pose.rArmX = -0.35;
      pose.lArmZ = -0.1;
      pose.rArmZ = 0.1;
    } else if (gesture === 'wave') {
      pose.torsoRotZ = -0.05;
      pose.headRotZ = 0.07;
      pose.rArmX = -2.35;
      pose.rArmZ = 0.42 + Math.sin(gt * 9.5) * 0.3;
      pose.lArmX = -0.1;
      pose.lArmZ = -0.16;
    } else if (gesture === 'head_shake') {
      pose.headRotY = Math.sin(gt * 9.0) * 0.34;
      pose.headRotX = 0.06;
      pose.torsoRotX = 0.05;
      pose.lArmX = -0.1;
      pose.rArmX = -0.1;
      pose.lArmZ = -0.15;
      pose.rArmZ = 0.15;
    } else if (gesture === 'hands_up_panic') {
      const jitter = Math.sin(gt * 18.0);
      pose.bodyY = 0.03 + Math.abs(jitter) * 0.035;
      pose.torsoRotX = -0.05;
      pose.headRotZ = jitter * 0.07;
      pose.lArmX = -2.65 + jitter * 0.14;
      pose.rArmX = -2.65 - jitter * 0.14;
      pose.lArmZ = -0.38;
      pose.rArmZ = 0.38;
    } else if (gesture === 'sip_coffee') {
      const sipWave = 0.5 + 0.5 * Math.sin(gt * 2.1);
      pose.rArmX = -1.15 - sipWave * 0.38;
      pose.rArmZ = -0.22;
      pose.rArmY = 0.25;
      pose.headRotX = -0.05 - sipWave * 0.07;
      pose.lArmX = -0.12;
      pose.lArmZ = -0.15;
    } else if (gesture === 'play_guitar') {
      const strum = Math.sin(gt * 10.0);
      pose.torsoRotZ = Math.sin(gt * 2.4) * 0.06;
      pose.headRotZ = Math.sin(gt * 2.4 + 0.6) * 0.08;
      pose.headRotX = 0.05;
      pose.lArmX = -0.88;
      pose.lArmZ = 0.24;
      pose.rArmX = -0.82 + strum * 0.26;
      pose.rArmZ = -0.26;
    }
  }

  dispose() {
    this.face.dispose();
  }
}
