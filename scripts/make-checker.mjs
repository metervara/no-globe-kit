import { writeFileSync } from 'node:fs';
import { encodePng } from './png.mjs';

/**
 * Builds public/textures/checker.png: an equirectangular calibration grid.
 *
 * 15-degree cells with coordinate labels, a marked equator, prime meridian and
 * antimeridian seam. Distortion towards the limb and the poles is obvious on
 * it, which makes it the map to use when reading the virtual FOV slider.
 */

const CELLS_X = 24; // 360 / 15
const CELLS_Y = 12; // 180 / 15
const CELL = 96;
const WIDTH = CELLS_X * CELL;
const HEIGHT = CELLS_Y * CELL;

const LIGHT = [232, 238, 246];
const DARK = [38, 48, 62];
const EQUATOR = [255, 210, 63];
const MERIDIAN = [255, 77, 94];
const SEAM = [180, 107, 255];

// 5x7 bitmap font, just the glyphs the labels need.
const FONT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

const pixels = new Uint8Array(WIDTH * HEIGHT * 3);

function set(x, y, rgb) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  pixels[i] = rgb[0];
  pixels[i + 1] = rgb[1];
  pixels[i + 2] = rgb[2];
}

function rect(x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, rgb);
}

function text(str, cx, cy, scale, rgb) {
  const glyphW = 5 * scale + scale;
  let x = Math.round(cx - (str.length * glyphW - scale) / 2);
  const y = Math.round(cy - (7 * scale) / 2);
  for (const ch of str) {
    const glyph = FONT[ch];
    if (glyph) {
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') rect(x + gx * scale, y + gy * scale, scale, scale, rgb);
        }
      }
    }
    x += glyphW;
  }
}

// Coarse 15-degree checker, with a low-contrast 4x4 subdivision inside each
// cell so there is still detail when the globe fills the screen.
for (let cy = 0; cy < CELLS_Y; cy++) {
  for (let cx = 0; cx < CELLS_X; cx++) {
    const even = (cx + cy) % 2 === 0;
    const base = even ? LIGHT : DARK;
    const shade = even ? -18 : 18;
    const sub = CELL / 4;

    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const lift = (sx + sy) % 2 === 0 ? shade : 0;
        rect(cx * CELL + sx * sub, cy * CELL + sy * sub, sub, sub, [
          base[0] + lift,
          base[1] + lift,
          base[2] + lift,
        ]);
      }
    }
  }
}

// Labels every 30 degrees: longitude over latitude, at the cell corners.
for (let cy = 0; cy < CELLS_Y; cy += 2) {
  for (let cx = 0; cx < CELLS_X; cx += 2) {
    const ink = (cx + cy) % 2 === 0 ? [74, 86, 102] : [170, 182, 198];
    const x = cx * CELL + CELL;
    const y = cy * CELL + CELL;
    text(String(cx * 15 - 180), x, y - 14, 2, ink);
    text(String(90 - cy * 15), x, y + 14, 2, ink);
  }
}

// Reference lines.
rect(0, HEIGHT / 2 - 3, WIDTH, 6, EQUATOR);
rect(WIDTH / 2 - 3, 0, 6, HEIGHT, MERIDIAN);
rect(0, 0, 4, HEIGHT, SEAM);
rect(WIDTH - 4, 0, 4, HEIGHT, SEAM);

writeFileSync('public/textures/checker.png', encodePng(WIDTH, HEIGHT, pixels));
console.log(`checker.png  ${WIDTH}x${HEIGHT}`);
