import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Core Three.js SceneManager with warm 3-point vinyl-figure lighting,
 * Day / Evening Chill lighting presets, and 60fps mobile pixelRatio cap.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.lightingMode = 'day'; // 'day' | 'evening'

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f3eadf');

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 80);
    this.camera.position.set(0, 2.35, 7.6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minPolarAngle = Math.PI * 0.14;
    this.controls.minDistance = 1.45;
    this.controls.maxDistance = 18;
    this.controls.target.set(0, 0.95, 0);

    // Smooth camera lerp state
    this._camGoalPos = null;
    this._camGoalTarget = null;

    this._setupThreePointLights();
    this._setupStudioStage();

    this._onResizeBound = () => this.resize();
    window.addEventListener('resize', this._onResizeBound);
  }

  _setupThreePointLights() {
    // 1. Warm Hemisphere ambient (cream sky + warm wood bounce)
    this.hemiLight = new THREE.HemisphereLight('#fff7eb', '#d7bba0', 1.15);
    this.scene.add(this.hemiLight);

    // 2. Key directional sunlight from upper front-right (soft vinyl figure modeling)
    this.keyLight = new THREE.DirectionalLight('#fff2df', 1.55);
    this.keyLight.position.set(5.5, 9.5, 7.0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 26;
    const d = 8.5;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // 3. Soft fill light from front-left to keep chibi faces evenly readable
    this.fillLight = new THREE.DirectionalLight('#f2e6ff', 0.55);
    this.fillLight.position.set(-6.0, 4.0, 5.5);
    this.scene.add(this.fillLight);

    // 4. Warm golden rim light from behind to pop hair & shoulders cleanly
    this.rimLight = new THREE.DirectionalLight('#ffd7a6', 0.65);
    this.rimLight.position.set(0.5, 5.0, -7.0);
    this.scene.add(this.rimLight);

    // 5. Cozy evening accent point light (boosted in evening mode)
    this.warmLampLight = new THREE.PointLight('#ffaa55', 0.0, 14, 1.4);
    this.warmLampLight.position.set(0, 3.2, 2.5);
    this.scene.add(this.warmLampLight);
  }

  /**
   * Warm vinyl studio backdrop stage used in Studio Inspect Mode (and Milestone 1 preview).
   */
  _setupStudioStage() {
    this.studioStage = new THREE.Group();
    this.studioStage.name = 'studio_stage';

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#ebd9c5',
      roughness: 0.82,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.8, 0.14, 48), floorMat);
    floor.position.y = -0.07;
    floor.receiveShadow = true;
    this.studioStage.add(floor);

    // Subtle decorative flat oval cream rug under the 6-character lineup
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.014, 40),
      new THREE.MeshStandardMaterial({ color: '#f7eee2', roughness: 0.92 })
    );
    rug.scale.set(4.6, 1, 1.45);
    rug.position.set(0, 0.004, 0);
    rug.receiveShadow = true;
    this.studioStage.add(rug);

    // Subtle soft curved backdrop arch reminiscent of Monica's warm lavender + cream trim
    const backdropMat = new THREE.MeshStandardMaterial({
      color: '#dfd3e6',
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const backdrop = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.2, 4.6, 40, 1, true, Math.PI * 0.72, Math.PI * 0.56),
      backdropMat
    );
    backdrop.position.set(0, 2.25, 1.8);
    this.studioStage.add(backdrop);

    this.scene.add(this.studioStage);
  }

  setStudioStageVisible(visible) {
    if (this.studioStage) {
      this.studioStage.visible = Boolean(visible);
    }
  }

  setLightingMode(mode) {
    this.lightingMode = mode === 'evening' ? 'evening' : 'day';
    if (this.lightingMode === 'evening') {
      this.scene.background.set('#282028');
      this.hemiLight.color.set('#b89fd6');
      this.hemiLight.groundColor.set('#4c3227');
      this.hemiLight.intensity = 0.72;
      this.keyLight.color.set('#ffc994');
      this.keyLight.intensity = 0.95;
      this.fillLight.color.set('#9bb4e0');
      this.fillLight.intensity = 0.4;
      this.rimLight.color.set('#ffae5c');
      this.rimLight.intensity = 1.05;
      this.warmLampLight.intensity = 2.4;
      this.renderer.toneMappingExposure = 1.02;
    } else {
      this.scene.background.set('#f3eadf');
      this.hemiLight.color.set('#fff7eb');
      this.hemiLight.groundColor.set('#d7bba0');
      this.hemiLight.intensity = 1.15;
      this.keyLight.color.set('#fff2df');
      this.keyLight.intensity = 1.55;
      this.fillLight.color.set('#f2e6ff');
      this.fillLight.intensity = 0.55;
      this.rimLight.color.set('#ffd7a6');
      this.rimLight.intensity = 0.65;
      this.warmLampLight.intensity = 0.0;
      this.renderer.toneMappingExposure = 1.06;
    }
  }

  focusCamera(position, target, instant = false) {
    if (instant) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this._camGoalPos = null;
      this._camGoalTarget = null;
      this.controls.update();
    } else {
      this._camGoalPos = position.clone();
      this._camGoalTarget = target.clone();
    }
  }

  cancelCameraGlide() {
    this._camGoalPos = null;
    this._camGoalTarget = null;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(dt) {
    const safeDt = Math.min(dt, 0.08);
    if (this._camGoalPos && this._camGoalTarget) {
      const alpha = 1 - Math.exp(-6.5 * safeDt);
      this.camera.position.lerp(this._camGoalPos, alpha);
      this.controls.target.lerp(this._camGoalTarget, alpha);
      if (
        this.camera.position.distanceTo(this._camGoalPos) < 0.015 &&
        this.controls.target.distanceTo(this._camGoalTarget) < 0.015
      ) {
        this._camGoalPos = null;
        this._camGoalTarget = null;
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
