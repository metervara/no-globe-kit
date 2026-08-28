import * as THREE from 'three';
import vertexShader from './shaders/globe.vert';
import fragmentShader from './shaders/globe.frag';
import { DEG } from './projection';
import type { Settings, SlotId } from './config';

const SLOT_UNIFORMS: Record<SlotId, string> = {
  day: 'uDayMap',
  night: 'uNightMap',
  water: 'uWaterMap',
  normal: 'uNormalMap',
};

export type Globe = ReturnType<typeof createGlobe>;

export function createGlobe(initial: Record<SlotId, THREE.Texture>) {
  const uniforms: Record<string, { value: unknown }> = {
    uDayMap: { value: initial.day },
    uNightMap: { value: initial.night },
    uWaterMap: { value: initial.water },
    uNormalMap: { value: initial.normal },

    uFov: { value: 0.5 },
    uFill: { value: 0.82 },

    uSpin: { value: 0 },
    uTilt: { value: 0 },

    uSunDir: { value: new THREE.Vector3(0, 0, 1) },
    uTerminator: { value: 0.09 },
    uNightLevel: { value: 0.03 },
    uNightLights: { value: 1.1 },
    uSpecular: { value: 0.35 },
    uShininess: { value: 40 },
    uNormalStrength: { value: 1 },
    uFlipNormalGreen: { value: 1 },
    uRimStrength: { value: 0.55 },
    uRimPower: { value: 3.2 },
    uRimColor: { value: new THREE.Color('#5fa8ff') },

    uMode: { value: 0 },
    uGraticule: { value: 0 },
    uPlaneBounds: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as THREE.ShaderMaterial['uniforms'],
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide, // so the reveal still shows something edge-on
  });

  // The entire "globe": one flat quad, two triangles.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);

  function setSlot(slot: SlotId, texture: THREE.Texture) {
    uniforms[SLOT_UNIFORMS[slot]].value = texture;
  }

  function apply(s: Settings) {
    uniforms.uFov.value = s.fov * DEG;
    uniforms.uFill.value = s.fill;

    uniforms.uSpin.value = s.spin * DEG;
    uniforms.uTilt.value = s.tilt * DEG;

    // Azimuth 0 puts the sun behind the camera; +90 moves it to the right.
    const az = s.sunAzimuth * DEG;
    const el = s.sunElevation * DEG;
    (uniforms.uSunDir.value as THREE.Vector3).set(
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    );

    uniforms.uTerminator.value = s.terminator;
    uniforms.uNightLevel.value = s.nightLevel;
    uniforms.uNightLights.value = s.nightLights;
    uniforms.uSpecular.value = s.specular;
    uniforms.uShininess.value = s.shininess;
    uniforms.uNormalStrength.value = s.normalStrength;
    uniforms.uFlipNormalGreen.value = s.flipNormalGreen ? -1 : 1;
    uniforms.uRimStrength.value = s.rimStrength;
    uniforms.uRimPower.value = s.rimPower;
    (uniforms.uRimColor.value as THREE.Color).set(s.rimColor);

    uniforms.uMode.value = s.mode;
    uniforms.uGraticule.value = s.graticule ? 1 : 0;
    uniforms.uPlaneBounds.value = s.showPlaneBounds ? 1 : 0;

    mesh.rotation.set(s.planePitch * DEG, s.planeYaw * DEG, s.planeRoll * DEG);
  }

  return { mesh, uniforms, setSlot, apply };
}
