# no-globe-kit

A globe with no globe in it. The scene contains **one flat quad** and a fragment
shader. No sphere geometry, no SDF raymarching, no instancing tricks — just an
analytic ray/sphere intersection per pixel, and an equirectangular texture
lookup on the hit point.

The point is that it is a *real* projection, not a circular mask over a flat
image: meridians converge, cells compress towards the limb, and the visible cap
changes when you change the virtual field of view.

```bash
npm install
npm run dev
```

## How it works

`src/shaders/globe.frag` is the whole trick, in four steps:

1. **Build a ray.** The quad's uv becomes a point on a square film plane. A
   *virtual* camera sits on +Z looking at the origin and fires a ray through it.
   This camera has nothing to do with the three.js camera — it only exists in
   the shader.
2. **Intersect a unit sphere.** Closed form, radius 1, centred on the origin.
   The discriminant doubles as an antialiased silhouette mask.
3. **Look up the maps.** Rotate the hit normal into map space, convert to
   latitude/longitude, sample. Derivatives are unwrapped by hand so the
   antimeridian doesn't turn into a blurry seam.
4. **Shade it.** One hardcoded sun: soft-terminator lambert, a water-masked
   Blinn highlight, city lights on the dark side, and a fresnel rim standing
   in for atmosphere. Deliberately not PBR.

Normal mapping needs a tangent frame, and there is no geometry to take one
from — but on a sphere you don't need geometry: +u is always due east and +v
always due north, and both fall straight out of the normal. See
`lib/normalmap.glsl`.

Camera distance is derived from the FOV so the globe keeps a constant on-screen
size — a dolly zoom. Narrow FOV converges on an orthographic globe showing
almost a full hemisphere; wide FOV shows a small cap, blown up.

## Grabbing the globe

Click and drag and the point you grabbed stays under the cursor.

On press it works out which point of the sphere the pointer is over and
remembers it in map space; on every move it solves for the orientation that
puts that same point back under the pointer. Because the globe is locked to an
up vector, orientation is exactly two unknowns (spin and tilt) and the target
point gives exactly two equations, so the solve is closed form — no iteration,
no fudge factor. Recomputing from the original grabbed point each move (rather
than accumulating deltas) means it never drifts, even once the tilt limit
clamps. Yaw is unbounded, tilt clamps to `tilt limit°`, and a flick spins on
with damping.

Dragging past the edge of the globe keeps working: a ray that misses falls back
to the nearest point on the limb. Dragging still works with the quad rotated
in the reveal controls, because the pointer is raycast against the quad's own
plane rather than the screen.

## Textures

Equirectangular (lat-long / plate carrée) only: 2:1 aspect, x = 360° of
longitude, y = 180° of latitude, north at the top. That's the format nearly
every "earth map" download uses.

Four independent slots, each switchable in the sidebar between a built-in file,
`None`, or your own image via the file picker:

| slot | what it does | built-in |
| --- | --- | --- |
| **day / albedo** | base colour | NASA Blue Marble (or the checker) |
| **night lights** | emissive on the dark side | NASA Black Marble |
| **water mask** | white = water; masks the specular so only oceans glint | NASA-derived land/water mask |
| **normal map** | topographic relief, tangent space | NASA-derived topography |

`None` binds a 1×1 neutral texel rather than branching, so the shader never has
to ask whether a slot is filled.

The **checker** is the map to reach for when reading the FOV slider: 15° cells
with labelled coordinates, a marked equator, prime meridian and seam, so the
distortion tells you exactly what the projection is doing.

Files live in `public/textures/` — see the README there for sources, how to
swap them, and why "flip normal green" defaults to on.

## Sidebar

| Group | What it does |
| --- | --- |
| render mode | shaded / texture / normals / rim / mask / map uv / lighting, plus **flat — no projection** for the naive version |
| textures | one row per slot: built-in, none, or load your own; normal strength and green flip |
| projection | virtual FOV, and how much of the frame the globe spans |
| globe | spin, tilt, tilt limit, auto-rotate, flick damping, lat/long grid overlay |
| light | sun direction, terminator softness, night level, city lights, specular, rim |
| plane reveal | yaw/pitch/roll the quad and outline it — "break the illusion" is the fun preset |

## Layout

```
src/
  main.ts              renderer, quad, resize, loop
  globe.ts             ShaderMaterial + uniform plumbing
  arcball.ts           grab-and-hold drag rotation
  projection.ts        CPU mirror of the shader's virtual camera
  gui.ts               lil-gui sidebar
  config.ts            settings, defaults, texture slot definitions
  textures.ts          slot loading, caching, neutral stand-ins
  shaders/
    globe.vert
    globe.frag         the whole projection
    lib/
      constants.glsl   PI, render mode ids
      rotate.glsl      axis rotations
      raysphere.glsl   analytic intersection
      equirect.glsl    lat-long mapping, seam-safe sampling, graticule
      normalmap.glsl   tangent frame from the normal alone
      shading.glsl     the fixed light rig + sRGB encode
scripts/
  fetch-earth-textures.sh   re-download the built-in earth maps
  make-checker.mjs          regenerate the calibration grid
  png.mjs                   dependency-free PNG encoder
public/textures/            the maps themselves — swap files here
```

`projection.ts` deliberately duplicates the virtual camera from `globe.frag`:
the arcball has to answer "what is under the cursor", which means running the
same ray setup on the CPU. Change one, change the other.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages →
Source → GitHub Actions**. `base: './'` in `vite.config.ts` keeps asset paths
relative, so it works from any repo subpath without further config.
