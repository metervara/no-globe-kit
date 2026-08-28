import * as THREE from 'three';
import { createGlobe } from './globe';
import { createGui } from './gui';
import { createArcball } from './arcball';
import { SLOT_IDS, defaultSettings, type Settings } from './config';
import { createTextureSlots } from './textures';
import type { Globe } from './globe';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x0a0c12, 1);

const scene = new THREE.Scene();

// A real perspective camera, so that turning the quad actually reads as a
// turning quad. It never moves; the projection lives in the shader.
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
scene.add(camera);

const settings: Settings = {
  ...defaultSettings,
  slots: { ...defaultSettings.slots },
};

// Each slot starts on a neutral 1x1 stand-in and is swapped in as its file
// arrives, so nothing has to wait for the textures to download.
let globe: Globe;
const textures = createTextureSlots((slot, texture) => globe.setSlot(slot, texture));

globe = createGlobe(textures.neutrals);
scene.add(globe.mesh);

for (const slot of SLOT_IDS) textures.select(slot, settings.slots[slot]);

const arcball = createArcball(canvas, camera, globe.mesh, settings);

const gui = createGui(settings, {
  onSlotChange: (slot, id) => textures.select(slot, id),
  onSlotFile: (slot, file) => textures.selectFile(slot, file),
});

/* --- resize --------------------------------------------------------- */

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Pull back just far enough that the 2x2 quad fits, with a little margin.
  const half = 1 * 1.12;
  const tan = Math.tan((camera.fov * Math.PI) / 180 / 2);
  camera.position.z = Math.max(half / tan, half / (tan * camera.aspect));
}

new ResizeObserver(resize).observe(canvas);
resize();

/* --- loop ----------------------------------------------------------- */

let lastTime = performance.now();
let smoothedDt = 1 / 60;

renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  smoothedDt += (dt - smoothedDt) * 0.08;
  gui.stats.fps = `${(1 / smoothedDt).toFixed(0)}`;

  arcball.update(dt);
  globe.apply(settings);
  renderer.render(scene, camera);
});
