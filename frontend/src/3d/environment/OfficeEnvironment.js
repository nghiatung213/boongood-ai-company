import * as THREE from 'three';
import { buildRoomShell } from './RoomShell.js';
import { buildSharedZones } from './SharedZonesBuilder.js';
import { buildWorkDesks } from './WorkDesksBuilder.js';
import { ALL_ZONE_IDS, ZONE_DEFINITIONS } from './OfficeLayout.js';

/**
 * Unified 12-zone "Central Perk × Monica's Apartment" 3D Office Environment.
 * Supports Day / Evening Chill lighting transitions, animated props (Chick & Duck, Secret Closet),
 * and full raycast picking across all 12 zone_ids matching zone_interactions.json.
 */
export class OfficeEnvironment {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'boongood_office_environment';

    this.roomShell = buildRoomShell();
    this.sharedZones = buildSharedZones();
    this.workDesks = buildWorkDesks();

    this.group.add(this.roomShell.group);
    this.group.add(this.sharedZones.group);
    this.group.add(this.workDesks.group);

    // Subtle ground highlight ring shown when user hovers/selects a zone
    this.zoneHighlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.82, 32),
      new THREE.MeshBasicMaterial({
        color: '#d66236',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.zoneHighlightRing.rotation.x = -Math.PI / 2;
    this.zoneHighlightRing.position.y = 0.025;
    this.zoneHighlightRing.visible = false;
    this.group.add(this.zoneHighlightRing);

    this._elapsed = 0;
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
  }

  setLightingMode(mode) {
    this.roomShell.setLightingMode(mode);
    this.workDesks.setLightingMode(mode);
  }

  getAllZoneIds() {
    return ALL_ZONE_IDS;
  }

  getZoneDefinition(zoneId) {
    return ZONE_DEFINITIONS[zoneId] || null;
  }

  highlightZone(zoneId) {
    const def = ZONE_DEFINITIONS[zoneId];
    if (!def) {
      this.zoneHighlightRing.visible = false;
      return;
    }
    this.zoneHighlightRing.position.set(def.position[0], 0.025, def.position[2]);
    this.zoneHighlightRing.visible = true;
  }

  triggerZoneEffect(zoneId) {
    if (zoneId === 'monica_secret_closet') {
      this.sharedZones.triggerClosetRattle();
    }
  }

  getRaycastTargets() {
    return [this.sharedZones.group, this.workDesks.group];
  }

  update(dt) {
    if (!this.group.visible) return;
    const safeDt = Math.min(dt, 0.08);
    this._elapsed += safeDt;
    this.sharedZones.update(safeDt, this._elapsed);

    if (this.zoneHighlightRing.visible) {
      const pulse = 1 + Math.sin(this._elapsed * 5.0) * 0.06;
      this.zoneHighlightRing.scale.set(pulse, pulse, 1);
    }
  }
}
