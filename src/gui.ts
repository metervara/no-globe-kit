import GUI from 'lil-gui';
import { RENDER_MODES, SLOTS, SLOT_IDS, defaultSettings, type Settings, type SlotId } from './config';

type Hooks = {
  onSlotChange: (slot: SlotId, id: string) => void;
  onSlotFile: (slot: SlotId, file: File) => void;
};

export function createGui(settings: Settings, hooks: Hooks) {
  const gui = new GUI({ title: 'no-globe-kit', width: 320 });

  gui.add(settings, 'mode', RENDER_MODES).name('render mode');

  /* --- texture slots ------------------------------------------------ */

  const maps = gui.addFolder('textures');
  for (const slot of SLOT_IDS) {
    const spec = SLOTS[slot];
    const options = { ...spec.options, 'Custom…': 'custom' };

    let previous = settings.slots[slot];
    const controller = maps
      .add(settings.slots, slot, options)
      .name(spec.label)
      .onChange((id: string) => {
        if (id === 'custom') {
          input.click();
          return;
        }
        previous = id;
        hooks.onSlotChange(slot, id);
      });

    // lil-gui has no file widget, so borrow its row markup for a plain input.
    const row = document.createElement('div');
    row.className = 'file-row';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      hooks.onSlotFile(slot, file);
      settings.slots[slot] = 'custom';
      controller.updateDisplay();
    });
    // Dismissing the file dialog would otherwise strand the slot on "Custom…".
    input.addEventListener('cancel', () => {
      if (settings.slots[slot] !== 'custom') return;
      settings.slots[slot] = previous;
      controller.updateDisplay();
    });
    row.append(input);
    maps.$children.append(row);
  }
  maps.add(settings, 'normalStrength', 0, 3, 0.01).name('normal strength');
  maps.add(settings, 'flipNormalGreen').name('flip normal green');

  /* --- projection --------------------------------------------------- */

  const projection = gui.addFolder('projection');
  projection.add(settings, 'fov', 2, 120, 1).name('virtual fov°');
  projection.add(settings, 'fill', 0.2, 1, 0.01).name('globe fills frame');

  /* --- globe -------------------------------------------------------- */

  const globe = gui.addFolder('globe');
  globe.add(settings, 'spin', -180, 180, 0.1).name('spin°').listen();
  globe.add(settings, 'tilt', -90, 90, 0.5).name('tilt°').listen();
  globe.add(settings, 'maxTilt', 0, 90, 1).name('tilt limit°');
  globe.add(settings, 'autoRotate').name('auto rotate');
  globe.add(settings, 'spinSpeed', -60, 60, 0.5).name('spin °/s');
  globe.add(settings, 'damping', 0.2, 12, 0.1).name('flick damping');
  globe.add(settings, 'graticule').name('lat/long grid');

  /* --- light -------------------------------------------------------- */

  const light = gui.addFolder('light');
  light.add(settings, 'sunAzimuth', -180, 180, 1).name('sun azimuth°');
  light.add(settings, 'sunElevation', -90, 90, 1).name('sun elevation°');
  light.add(settings, 'terminator', 0.001, 0.5, 0.001).name('terminator softness');
  light.add(settings, 'nightLevel', 0, 0.5, 0.005).name('night level');
  light.add(settings, 'nightLights', 0, 3, 0.01).name('city lights');
  light.add(settings, 'specular', 0, 1, 0.01).name('specular');
  light.add(settings, 'shininess', 2, 200, 1).name('shininess');
  light.add(settings, 'rimStrength', 0, 2, 0.01).name('rim strength');
  light.add(settings, 'rimPower', 0.5, 8, 0.1).name('rim power');
  light.addColor(settings, 'rimColor').name('rim colour');

  /* --- plane reveal ------------------------------------------------- */

  const reveal = gui.addFolder('plane reveal');
  reveal.add(settings, 'showPlaneBounds').name('show the quad').listen();
  reveal.add(settings, 'planeYaw', -180, 180, 0.5).name('yaw°').listen();
  reveal.add(settings, 'planePitch', -180, 180, 0.5).name('pitch°').listen();
  reveal.add(settings, 'planeRoll', -180, 180, 0.5).name('roll°').listen();
  reveal
    .add(
      {
        break: () => {
          settings.showPlaneBounds = true;
          settings.planeYaw = 52;
          settings.planePitch = -22;
          settings.planeRoll = 8;
        },
      },
      'break',
    )
    .name('break the illusion');
  reveal
    .add(
      {
        reset: () => {
          settings.planeYaw = 0;
          settings.planePitch = 0;
          settings.planeRoll = 0;
          settings.showPlaneBounds = defaultSettings.showPlaneBounds;
        },
      },
      'reset',
    )
    .name('face on');

  /* --- stats -------------------------------------------------------- */

  const stats = { fps: '' };
  gui.add(stats, 'fps').name('fps').disable().listen();

  return Object.assign(gui, { stats });
}
