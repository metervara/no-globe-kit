import * as THREE from 'three';
import { SLOTS, TEXTURE_FILES, type SlotId } from './config';

/**
 * Every map here is equirectangular (lat-long / plate carree): 2:1 aspect,
 * x = 360 degrees of longitude, y = 180 degrees of latitude, north at the top.
 * That is the format almost every "earth map" download uses, and the only
 * thing globe.frag knows how to read.
 */

function configure(texture: THREE.Texture, color: boolean): THREE.Texture {
  // Colour maps are sRGB; masks and normal maps are data and must stay linear.
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping; // longitude wraps around
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** 1x1 stand-in so a slot set to "none" still has something bound. */
export function neutralTexture([r, g, b]: [number, number, number], color: boolean) {
  const texture = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  texture.needsUpdate = true;
  return configure(texture, color);
}

export function loadTexture(url: string, color: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => resolve(configure(texture, color)),
      undefined,
      () => reject(new Error(`could not load ${url}`)),
    );
  });
}

/** Resolves against the page, so it survives a GitHub Pages subpath. */
export function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

/**
 * Holds one texture per slot, plus a cache so switching back and forth in the
 * sidebar does not refetch. Slots are independent: day, night lights, water
 * mask and normal map can each come from a built-in file or your own image.
 */
export function createTextureSlots(onChange: (slot: SlotId, texture: THREE.Texture) => void) {
  const cache = new Map<string, THREE.Texture>();
  const neutrals = {} as Record<SlotId, THREE.Texture>;

  for (const [slot, spec] of Object.entries(SLOTS)) {
    neutrals[slot as SlotId] = neutralTexture(spec.neutral, spec.color);
  }

  async function select(slot: SlotId, id: string) {
    const spec = SLOTS[slot];
    if (id === 'none' || !TEXTURE_FILES[id]) {
      onChange(slot, neutrals[slot]);
      return;
    }

    const key = `${id}:${spec.color}`;
    const cached = cache.get(key);
    if (cached) {
      onChange(slot, cached);
      return;
    }

    try {
      const texture = await loadTexture(assetUrl(TEXTURE_FILES[id]), spec.color);
      cache.set(key, texture);
      onChange(slot, texture);
    } catch (error) {
      console.warn(error);
      onChange(slot, neutrals[slot]);
    }
  }

  /** A user-supplied image, from the file picker next to each slot. */
  async function selectFile(slot: SlotId, file: File) {
    const url = URL.createObjectURL(file);
    try {
      const texture = await loadTexture(url, SLOTS[slot].color);
      cache.get(`custom:${slot}`)?.dispose();
      cache.set(`custom:${slot}`, texture);
      onChange(slot, texture);
    } catch (error) {
      console.warn(error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return { neutrals, select, selectFile };
}
