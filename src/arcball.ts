import * as THREE from 'three';
import type { Settings } from './config';
import { DEG, filmToSphere, rotateX, rotateY } from './projection';

const MAX_FLICK = 720; // deg/s, so a fast throw stays readable

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const wrapDeg = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/**
 * Drag-to-rotate that actually holds the point you grabbed.
 *
 * On press we work out which point of the sphere is under the cursor and
 * remember it in map space. On every move we solve for the orientation that
 * puts that same point back under the cursor. Because the globe is locked to
 * an up vector, orientation is exactly two unknowns -- spin and tilt -- and
 * the two coordinates of the target point give us exactly two equations, so
 * the solve is closed form.
 *
 * Recomputing from the original grabbed point (rather than accumulating
 * frame-to-frame deltas) means the point never drifts out from under the
 * cursor, even after the tilt limit clamps.
 */
export function createArcball(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  mesh: THREE.Mesh,
  settings: Settings,
) {
  const raycaster = new THREE.Raycaster();
  const filmPlane = new THREE.Plane();
  const ndc = new THREE.Vector2();
  const planeNormal = new THREE.Vector3();
  const planeOrigin = new THREE.Vector3();
  const worldHit = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const rotated = new THREE.Vector3();

  let grabbed: THREE.Vector3 | null = null;
  let pointerId = -1;
  let spinVel = 0;
  let tiltVel = 0;
  let lastMove = 0;

  function pointerToSphere(event: PointerEvent): THREE.Vector3 | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);

    // Intersect the quad's *infinite* plane rather than its geometry, so a
    // drag keeps working past the edge of the film.
    mesh.updateMatrixWorld();
    planeNormal.set(0, 0, 1).transformDirection(mesh.matrixWorld);
    mesh.getWorldPosition(planeOrigin);
    filmPlane.setFromNormalAndCoplanarPoint(planeNormal, planeOrigin);
    if (!raycaster.ray.intersectPlane(filmPlane, worldHit)) return null;

    // Local x/y of a PlaneGeometry(2, 2) *is* the film coordinate.
    mesh.worldToLocal(worldHit);
    return filmToSphere(worldHit.x, worldHit.y, settings.fov, settings.fill, scratch).point;
  }

  /** Shading space -> map space, undoing the orientation we have now. */
  function toMapSpace(p: THREE.Vector3): THREE.Vector3 {
    const o = p.clone();
    rotateX(o, -settings.tilt * DEG);
    rotateY(o, -settings.spin * DEG);
    return o;
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const point = pointerToSphere(event);
    if (!point) return;

    grabbed = toMapSpace(point);
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    canvas.style.cursor = 'grabbing';
    spinVel = 0;
    tiltVel = 0;
    lastMove = performance.now();
  }

  function onPointerMove(event: PointerEvent) {
    if (!grabbed || event.pointerId !== pointerId) return;
    const target = pointerToSphere(event);
    if (!target) return;

    const o = grabbed;
    const prevSpin = settings.spin * DEG;

    // Solve Rx(tilt) * Ry(spin) * o = target.
    //
    // Rx leaves x untouched, so spin falls out of the x component alone:
    //   o.x * cos(spin) + o.z * sin(spin) = target.x
    let spin = prevSpin;
    const radius = Math.hypot(o.x, o.z);
    if (radius > 1e-4) {
      const phi = Math.atan2(o.z, o.x);
      const delta = Math.acos(clamp(target.x / radius, -1, 1));
      // Two branches — take whichever is the shorter move from here.
      const a = wrapPi(phi + delta - prevSpin);
      const b = wrapPi(phi - delta - prevSpin);
      spin = prevSpin + (Math.abs(a) <= Math.abs(b) ? a : b);
    }

    // With spin known, tilt is the angle between the two points in the y/z
    // plane. Clamping here is what keeps the poles from flipping over.
    rotated.copy(o);
    rotateY(rotated, spin);
    const limit = settings.maxTilt * DEG;
    const tilt = clamp(
      wrapPi(Math.atan2(target.z, target.y) - Math.atan2(rotated.z, rotated.y)),
      -limit,
      limit,
    );

    const now = performance.now();
    const dt = Math.max((now - lastMove) / 1000, 1 / 240);
    lastMove = now;

    const spinDeg = spin / DEG;
    const tiltDeg = tilt / DEG;
    spinVel = clamp((spinDeg - settings.spin) / dt, -MAX_FLICK, MAX_FLICK);
    tiltVel = clamp((tiltDeg - settings.tilt) / dt, -MAX_FLICK, MAX_FLICK);

    settings.spin = wrapDeg(spinDeg);
    settings.tilt = tiltDeg;
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    canvas.releasePointerCapture(pointerId);
    grabbed = null;
    pointerId = -1;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.style.cursor = 'grab';

  /** Auto-rotate and spin-down live here so nothing fights the drag. */
  function update(dt: number) {
    if (!grabbed) {
      if (settings.autoRotate) settings.spin += settings.spinSpeed * dt;

      if (spinVel !== 0 || tiltVel !== 0) {
        settings.spin += spinVel * dt;
        settings.tilt += tiltVel * dt;

        const decay = Math.exp(-settings.damping * dt);
        spinVel *= decay;
        tiltVel *= decay;
        if (Math.abs(spinVel) < 0.5) spinVel = 0;
        if (Math.abs(tiltVel) < 0.5) tiltVel = 0;
      }
    }

    settings.spin = wrapDeg(settings.spin);
    settings.tilt = clamp(settings.tilt, -settings.maxTilt, settings.maxTilt);
  }

  return { update, isDragging: () => grabbed !== null };
}
