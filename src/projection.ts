import * as THREE from 'three';

/**
 * The CPU-side mirror of the virtual camera in globe.frag. The arcball needs
 * to answer "which point of the sphere is under the cursor", which means
 * running the exact same ray setup the shader runs. If you change the camera
 * maths in one place, change it in the other.
 */

export const DEG = Math.PI / 180;

export function rotateX(p: THREE.Vector3, angle: number): THREE.Vector3 {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return p.set(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

export function rotateY(p: THREE.Vector3, angle: number): THREE.Vector3 {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return p.set(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

/**
 * A point on the film plane (-1..1) to the point of the unit sphere it hits.
 * Misses fall back to the nearest point on the limb, which is what keeps a
 * drag going when the cursor slides off the globe.
 */
export function filmToSphere(
  filmX: number,
  filmY: number,
  fovDeg: number,
  fill: number,
  target = new THREE.Vector3(),
): { point: THREE.Vector3; hit: boolean } {
  const halfFov = 0.5 * fovDeg * DEG;
  const tanHalf = Math.tan(halfFov);
  const camDist = 1 / Math.sin(Math.atan(fill * tanHalf));

  const dir = target.set(filmX * tanHalf, filmY * tanHalf, -1).normalize();

  // |origin + t * dir| = 1, near root. origin is (0, 0, camDist).
  const b = dir.z * camDist;
  const c = camDist * camDist - 1;
  const discriminant = b * b - c;
  const t = -b - Math.sqrt(Math.max(discriminant, 0));

  dir.multiplyScalar(t);
  dir.z += camDist;

  return { point: dir.normalize(), hit: discriminant >= 0 };
}
