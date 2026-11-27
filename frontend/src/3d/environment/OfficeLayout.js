import * as THREE from 'three';

export const OFFICE_BOUNDS = {
  width: 16.4,
  depth: 12.2,
  halfW: 8.2,
  halfD: 6.1,
  wallHeight: 4.5,
};

/**
 * Canonical 12-zone map matching frontend/src/data/lore/zone_interactions.json 1:1.
 * Each entry defines:
 * - position: anchor of the prop/desk in world space
 * - standSpot: ideal walkable spot where an NPC stands to interact with this zone
 * - lookTarget: world point the NPC faces while interacting
 * - cameraOffset: offset for smooth zone inspection glide
 * - obstacle: axis-aligned footprint { minX, maxX, minZ, maxZ } for Milestone 3 WaypointNav
 */
export const ZONE_DEFINITIONS = {
  purple_door: {
    id: 'purple_door',
    label: 'Cánh cửa màu tím khung vàng',
    shortLabel: 'Cửa tím #20',
    position: [-5.9, 0, -5.85],
    standSpot: [-5.9, 0, -4.45],
    lookTarget: [-5.9, 1.3, -5.9],
    cameraOffset: [1.6, 2.4, 4.4],
    obstacle: { minX: -6.9, maxX: -4.9, minZ: -6.1, maxZ: -5.3 },
  },
  monica_secret_closet: {
    id: 'monica_secret_closet',
    label: 'Chiếc tủ khóa kín của Monica',
    shortLabel: 'Tủ bí mật',
    position: [-3.1, 0, -5.85],
    standSpot: [-3.1, 0, -4.45],
    lookTarget: [-3.1, 1.3, -5.9],
    cameraOffset: [1.4, 2.3, 4.4],
    obstacle: { minX: -4.0, maxX: -2.2, minZ: -6.1, maxZ: -5.2 },
  },
  coffee_counter: {
    id: 'coffee_counter',
    label: 'Quầy cà phê Central Perk',
    shortLabel: 'Quầy cà phê',
    position: [4.9, 0, -4.4],
    standSpot: [4.6, 0, -2.7],
    lookTarget: [4.9, 1.2, -4.6],
    cameraOffset: [-2.4, 2.7, 4.6],
    obstacle: { minX: 2.8, maxX: 7.4, minZ: -5.9, maxZ: -3.4 },
  },
  chick_duck_corner: {
    id: 'chick_duck_corner',
    label: 'Góc Gà & Vịt + Magna Doodle',
    shortLabel: 'Góc Gà & Vịt',
    position: [-6.4, 0, -2.5],
    standSpot: [-4.9, 0, -2.3],
    lookTarget: [-6.6, 0.8, -2.5],
    cameraOffset: [3.8, 2.4, 3.2],
    obstacle: { minX: -7.9, maxX: -5.5, minZ: -3.7, maxZ: -1.3 },
  },
  foosball_table: {
    id: 'foosball_table',
    label: 'Bàn bi lắc',
    shortLabel: 'Bàn bi lắc',
    position: [-2.4, 0, -1.2],
    standSpot: [-2.4, 0, 0.25],
    lookTarget: [-2.4, 0.9, -1.2],
    cameraOffset: [2.2, 2.7, 3.8],
    obstacle: { minX: -3.5, maxX: -1.3, minZ: -2.0, maxZ: -0.4 },
  },
  orange_sofa: {
    id: 'orange_sofa',
    label: 'Bộ sofa cam có biển RESERVED',
    shortLabel: 'Sofa cam',
    position: [1.45, 0, -1.4],
    standSpot: [1.45, 0, 0.9],
    lookTarget: [1.45, 0.8, -1.4],
    cameraOffset: [0.4, 2.8, 4.8],
    obstacle: { minX: -0.25, maxX: 3.15, minZ: -2.25, maxZ: 0.3 },
  },
  desk_phoebe: {
    id: 'desk_phoebe',
    label: 'Bàn Phoebe (CSKH, Sáng tạo & Đàn guitar)',
    shortLabel: 'Bàn Phoebe',
    owner: 'phoebe',
    position: [-6.2, 0, 0.8],
    rotationY: Math.PI / 2,
    standSpot: [-4.8, 0, 0.8],
    lookTarget: [-6.2, 1.0, 0.8],
    cameraOffset: [3.6, 2.3, 2.6],
    obstacle: { minX: -7.4, maxX: -5.3, minZ: -0.25, maxZ: 1.85 },
  },
  desk_rachel: {
    id: 'desk_rachel',
    label: 'Bàn Rachel (Thương hiệu & Thiết kế)',
    shortLabel: 'Bàn Rachel',
    owner: 'rachel',
    position: [-6.2, 0, 3.65],
    rotationY: Math.PI / 2,
    standSpot: [-4.8, 0, 3.65],
    lookTarget: [-6.2, 1.0, 3.65],
    cameraOffset: [3.6, 2.3, 2.6],
    obstacle: { minX: -7.4, maxX: -5.3, minZ: 2.6, maxZ: 4.7 },
  },
  desk_monica: {
    id: 'desk_monica',
    label: 'Bàn Monica (Vận hành & Sản phẩm)',
    shortLabel: 'Bàn Monica',
    owner: 'monica',
    position: [-2.1, 0, 4.2],
    rotationY: Math.PI,
    standSpot: [-2.1, 0, 2.85],
    lookTarget: [-2.1, 1.0, 4.2],
    cameraOffset: [0.6, 2.4, 3.8],
    obstacle: { minX: -3.2, maxX: -1.0, minZ: 3.4, maxZ: 5.2 },
  },
  desk_chandler: {
    id: 'desk_chandler',
    label: 'Bàn Chandler (Dữ liệu, Tài chính & Copy)',
    shortLabel: 'Bàn Chandler',
    owner: 'chandler',
    position: [1.8, 0, 4.2],
    rotationY: Math.PI,
    standSpot: [1.8, 0, 2.85],
    lookTarget: [1.8, 1.0, 4.2],
    cameraOffset: [-0.6, 2.4, 3.8],
    obstacle: { minX: 0.7, maxX: 2.9, minZ: 3.4, maxZ: 5.2 },
  },
  desk_ross: {
    id: 'desk_ross',
    label: 'Bàn Ross (Nghiên cứu, Pháp lý & Khủng long)',
    shortLabel: 'Bàn Ross',
    owner: 'ross',
    position: [6.1, 0, 0.3],
    rotationY: -Math.PI / 2,
    standSpot: [4.75, 0, 0.3],
    lookTarget: [6.1, 1.0, 0.3],
    cameraOffset: [-3.6, 2.3, 2.6],
    obstacle: { minX: 5.2, maxX: 7.4, minZ: -0.75, maxZ: 1.35 },
  },
  desk_joey: {
    id: 'desk_joey',
    label: 'Bàn Joey (Truyền thông, Video & Hugsy)',
    shortLabel: 'Bàn Joey',
    owner: 'joey',
    position: [6.1, 0, 3.45],
    rotationY: -Math.PI / 2,
    standSpot: [4.75, 0, 3.45],
    lookTarget: [6.1, 1.0, 3.45],
    cameraOffset: [-3.6, 2.3, 2.6],
    obstacle: { minX: 5.2, maxX: 7.4, minZ: 2.4, maxZ: 4.5 },
  },
};

export const ALL_ZONE_IDS = Object.keys(ZONE_DEFINITIONS);

export const CHARACTER_HOME_ZONE = {
  rachel: 'desk_rachel',
  monica: 'desk_monica',
  chandler: 'desk_chandler',
  ross: 'desk_ross',
  joey: 'desk_joey',
  phoebe: 'desk_phoebe',
};

export function getOfficeOverviewCamera(isMobile) {
  if (isMobile) {
    return {
      position: new THREE.Vector3(0.2, 13.8, 17.6),
      target: new THREE.Vector3(0, 0.4, 0.2),
    };
  }
  return {
    position: new THREE.Vector3(0.4, 10.6, 13.8),
    target: new THREE.Vector3(0, 0.55, -0.2),
  };
}
