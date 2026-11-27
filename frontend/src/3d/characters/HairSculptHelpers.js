import * as THREE from 'three';

/**
 * Shared sculptural hair & conformal garment builders for Pop Mart Vinyl Chibi aesthetic.
 * Eliminates hollow open-ended tubes and helmet-like hair domes covering the eyes.
 */

/**
 * Builds a closed, smoothly tapered organic vinyl hair strand along a 3D CatmullRom curve.
 * Radius tapers smoothly from root -> plump mid -> soft rounded tip (zero open pipe ends!).
 */
export function createTaperedHairStrand(points, {
  rootRadius = 0.065,
  midRadius = 0.082,
  tipRadius = 0.014,
  tubularSegments = 18,
  radialSegments = 10,
  flattenZ = 1.0,
  material,
}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);

  const positions = [];
  const uvs = [];
  const indices = [];

  const ringCount = tubularSegments + 1;
  const ringVerts = radialSegments + 1;
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < ringCount; i += 1) {
    const t = i / tubularSegments;
    curve.getPointAt(t, p);

    // Smooth plump-to-pointed taper curve with rounded endcaps at t=0 and t=1
    let r;
    if (i === 0) {
      r = 0.001;
    } else if (i === ringCount - 1) {
      r = 0.001;
    } else if (t < 0.28) {
      const k = t / 0.28;
      r = THREE.MathUtils.lerp(rootRadius, midRadius, Math.sin(k * Math.PI * 0.5));
    } else {
      const k = (t - 0.28) / 0.72;
      r = THREE.MathUtils.lerp(midRadius, tipRadius, Math.pow(k, 1.35));
    }

    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j < ringVerts; j += 1) {
      const a = (j / radialSegments) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a) * flattenZ;

      v.copy(p)
        .addScaledVector(N, cosA * r)
        .addScaledVector(B, sinA * r);

      positions.push(v.x, v.y, v.z);
      uvs.push(j / radialSegments, t);
    }
  }

  for (let i = 0; i < tubularSegments; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * ringVerts + j;
      const b = (i + 1) * ringVerts + j;
      const c = (i + 1) * ringVerts + (j + 1);
      const d = i * ringVerts + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a smooth back-tilted vinyl hair cap that exposes the forehead, brows, and eyes cleanly
 * while wrapping lushly over the crown and back of the skull with zero side paper slivers.
 */
export function createFittedHairCap(material, {
  radius = 0.428,
  tiltBack = 0.58,
  thetaLength = Math.PI * 0.55,
  scaleX = 1.045,
  scaleY = 0.94,
  scaleZ = 1.05,
  offsetY = 0.035,
  offsetZ = -0.025,
} = {}) {
  // Use a closed slightly-flattened vinyl hair dome shifted slightly back & tilted backward
  const geo = new THREE.SphereGeometry(radius, 32, 24, 0, Math.PI * 2, 0, thetaLength);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -tiltBack;
  mesh.scale.set(scaleX, scaleY, scaleZ);
  mesh.position.set(0, offsetY, offsetZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Generates a high-resolution custom torso wrap CanvasTexture (front + back + jacket/shirt/buttons)
 * mapped seamlessly onto the bell-shaped LatheGeometry torso so clothes contour 100% flush with zero floating strips!
 */
export function createTorsoGarmentTexture(drawFn) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds a properly outward-wound flared skirt LatheGeometry (points ordered bottom -> top
 * so normals face strictly OUTWARD with zero backface culling holes!).
 */
export function createOutwardSkirtGeometry(bottomY, topY, bottomRadius, topRadius, segments = 32) {
  const midY = (bottomY + topY) * 0.5;
  const midR = THREE.MathUtils.lerp(bottomRadius, topRadius, 0.48);
  const profile = [
    new THREE.Vector2(bottomRadius * 0.88, bottomY),
    new THREE.Vector2(bottomRadius, bottomY + 0.015),
    new THREE.Vector2(midR, midY),
    new THREE.Vector2(topRadius, topY),
  ];
  const geo = new THREE.LatheGeometry(profile, segments);
  geo.scale(1.05, 1.0, 0.88);
  return geo;
}
