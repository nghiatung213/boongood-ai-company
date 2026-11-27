import * as THREE from 'three';

/**
 * Miniature handheld props attached to rightHandAnchor / torso during specific gestures
 * (sip_coffee, play_guitar, or Rachel's signature color swatch).
 */
export function createCoffeeMugProp() {
  const group = new THREE.Group();
  group.name = 'prop_coffee_mug';

  const cupMat = new THREE.MeshStandardMaterial({
    color: '#fdf6ea',
    roughness: 0.35,
    metalness: 0.05,
  });
  const coffeeMat = new THREE.MeshStandardMaterial({
    color: '#4c2c1b',
    roughness: 0.25,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: '#2e6b4f',
    roughness: 0.5,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.13, 16), cupMat);
  body.position.y = 0.02;
  group.add(body);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.062, 0.04, 16), bandMat);
  band.position.y = 0.02;
  group.add(band);

  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), coffeeMat);
  liquid.position.y = 0.078;
  group.add(liquid);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 8, 14, Math.PI), cupMat);
  handle.position.set(0.064, 0.02, 0);
  handle.rotation.z = -Math.PI / 2;
  group.add(handle);

  group.visible = false;
  return group;
}

export function createAcousticGuitarProp() {
  const group = new THREE.Group();
  group.name = 'prop_acoustic_guitar';

  const woodLight = new THREE.MeshStandardMaterial({
    color: '#d99a54',
    roughness: 0.45,
    metalness: 0.04,
  });
  const woodDark = new THREE.MeshStandardMaterial({
    color: '#6b3e24',
    roughness: 0.5,
  });
  const holeMat = new THREE.MeshStandardMaterial({
    color: '#24140c',
    roughness: 0.85,
  });

  // Lower & upper rounded bouts (classic figure-8 silhouette)
  const lowerBout = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.065, 20), woodLight);
  lowerBout.rotation.x = Math.PI / 2;
  lowerBout.position.set(0.08, -0.04, 0);
  group.add(lowerBout);

  const upperBout = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.065, 20), woodLight);
  upperBout.rotation.x = Math.PI / 2;
  upperBout.position.set(-0.07, 0.03, 0);
  group.add(upperBout);

  const soundHole = new THREE.Mesh(new THREE.CircleGeometry(0.046, 16), holeMat);
  soundHole.position.set(0.01, -0.01, 0.034);
  group.add(soundHole);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.08, 0.012), woodDark);
  bridge.position.set(0.12, -0.05, 0.034);
  group.add(bridge);

  // Guitar neck & headstock
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.044, 0.026), woodDark);
  neck.position.set(-0.27, 0.11, 0.008);
  neck.rotation.z = -0.34;
  group.add(neck);

  const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.028), woodDark);
  headstock.position.set(-0.44, 0.17, 0.008);
  headstock.rotation.z = -0.34;
  group.add(headstock);

  group.position.set(0.02, 0.25, 0.24);
  group.rotation.set(0.08, -0.05, 0.18);
  group.visible = false;
  return group;
}

export function createSwatchFanProp() {
  const group = new THREE.Group();
  group.name = 'prop_swatch_fan';
  const colors = ['#f4d6cc', '#e8a894', '#c9d9c5', '#f3dfaa'];
  colors.forEach((hex, idx) => {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.008),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 })
    );
    card.position.set(idx * 0.012, 0.03, idx * 0.006);
    card.rotation.z = -0.3 + idx * 0.2;
    group.add(card);
  });
  return group;
}
