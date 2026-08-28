/** Keys are what lil-gui shows; values must match the MODE_* defines in
 *  src/shaders/lib/constants.glsl. */
export const RENDER_MODES = {
  Shaded: 0,
  'Texture (unlit)': 1,
  Normals: 2,
  Rim: 3,
  'Mask (circle)': 4,
  'Map UV': 5,
  Lighting: 6,
  'Flat — no projection': 7,
} as const;

/* ------------------------------------------------------------------ */
/* Texture slots                                                        */
/* ------------------------------------------------------------------ */

export const SLOT_IDS = ['day', 'night', 'water', 'normal'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

type SlotSpec = {
  label: string;
  /** sRGB for anything you look at, linear for data maps. */
  color: boolean;
  /** Bound when the slot is set to "none", so the sampler is never empty. */
  neutral: [number, number, number];
  options: Record<string, string>;
};

/** Files live in public/textures/ — drop a replacement in and it just works. */
export const TEXTURE_FILES: Record<string, string> = {
  'earth-day': 'textures/earth-day.jpg',
  'earth-night': 'textures/earth-night.jpg',
  'earth-water': 'textures/earth-water.jpg',
  'earth-normal': 'textures/earth-normal.jpg',
  checker: 'textures/checker.png',
};

export const SLOTS: Record<SlotId, SlotSpec> = {
  day: {
    label: 'day / albedo',
    color: true,
    neutral: [128, 128, 128],
    options: { 'Blue Marble': 'earth-day', Checker: 'checker', None: 'none' },
  },
  night: {
    label: 'night lights',
    color: true,
    neutral: [0, 0, 0],
    options: { 'Black Marble': 'earth-night', None: 'none' },
  },
  water: {
    label: 'water mask (spec)',
    color: false,
    neutral: [255, 255, 255],
    options: { 'Land/water': 'earth-water', None: 'none' },
  },
  normal: {
    label: 'normal map',
    color: false,
    neutral: [128, 128, 255], // flat tangent-space normal
    options: { Topography: 'earth-normal', None: 'none' },
  },
};

/* ------------------------------------------------------------------ */

export type Settings = {
  mode: number;
  slots: Record<SlotId, string>;

  // Virtual camera — this is the projection, not the real three.js camera.
  fov: number; // degrees
  fill: number; // 0..1 of the frame

  // Globe
  spin: number; // degrees, unbounded (wraps)
  tilt: number; // degrees, clamped to maxTilt
  maxTilt: number; // degrees
  autoRotate: boolean;
  spinSpeed: number; // degrees / second
  damping: number; // how fast a flick decays

  // Light
  sunAzimuth: number; // degrees
  sunElevation: number; // degrees
  terminator: number;
  nightLevel: number;
  nightLights: number;
  specular: number;
  shininess: number;
  normalStrength: number;
  flipNormalGreen: boolean;
  rimStrength: number;
  rimPower: number;
  rimColor: string;

  // Overlays
  graticule: boolean;

  // Plane reveal
  planeYaw: number;
  planePitch: number;
  planeRoll: number;
  showPlaneBounds: boolean;
};

export const defaultSettings: Settings = {
  mode: 0,
  slots: { day: 'earth-day', night: 'earth-night', water: 'earth-water', normal: 'earth-normal' },

  fov: 30,
  fill: 0.82,

  spin: 0,
  tilt: 18,
  maxTilt: 80,
  autoRotate: true,
  spinSpeed: 6,
  damping: 3.5,

  sunAzimuth: -38,
  sunElevation: 18,
  terminator: 0.09,
  nightLevel: 0.03,
  nightLights: 1.1,
  specular: 0.35,
  shininess: 40,
  normalStrength: 1,
  // The bundled topography map is Y-down (green = south). Verified by
  // integrating the gradient field back into a heightfield: with green
  // treated as north, Tibet came out lower than the Ganges plain.
  flipNormalGreen: true,
  rimStrength: 0.55,
  rimPower: 3.2,
  rimColor: '#5fa8ff',

  graticule: false,

  planeYaw: 0,
  planePitch: 0,
  planeRoll: 0,
  showPlaneBounds: false,
};
