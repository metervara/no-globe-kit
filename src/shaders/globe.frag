// no-globe-kit
// ------------
// There is no sphere in this scene. There is one flat quad, and this shader.
//
// For every fragment we build a ray from a *virtual* camera through the quad,
// intersect it with an imaginary unit sphere, and look the hit point up in an
// equirectangular map. The quad is just the film.

#include lib/constants.glsl;
#include lib/rotate.glsl;
#include lib/raysphere.glsl;
#include lib/equirect.glsl;
#include lib/normalmap.glsl;
#include lib/shading.glsl;

// Texture slots. Each is either a real map or a 1x1 neutral stand-in, so the
// shader never has to ask whether a slot is filled.
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uWaterMap;
uniform sampler2D uNormalMap;

// Virtual camera
uniform float uFov;   // vertical field of view, radians
uniform float uFill;  // how much of the frame the globe spans, 0..1

// Globe orientation
uniform float uSpin;  // rotation about the globe's own axis
uniform float uTilt;  // axial tilt towards / away from the camera

// Lighting
uniform vec3  uSunDir;
uniform float uTerminator;
uniform float uNightLevel;
uniform float uNightLights;
uniform float uSpecular;
uniform float uShininess;
uniform float uNormalStrength;
uniform float uFlipNormalGreen;
uniform float uRimStrength;
uniform float uRimPower;
uniform vec3  uRimColor;

// Debug
uniform int   uMode;
uniform float uGraticule;
uniform float uPlaneBounds;

varying vec2 vUv;

void main() {
  // Quad uv -> a square film plane in -1..1, y up.
  vec2 film = vUv * 2.0 - 1.0;

  // Distance to the edge of the quad, for the reveal overlay.
  float toEdge = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5));
  float border = smoothstep(0.5 - 0.004 - fwidth(toEdge) * 1.5, 0.5 - 0.004, toEdge);
  float showBorder = border * uPlaneBounds;

  // "Flat" mode skips every bit of sphere maths, so you can see exactly what
  // the naive version looks like next to the projected one.
  if (uMode == MODE_FLAT) {
    vec3 flat_ = texture2D(uDayMap, vUv).rgb;
    flat_ = mix(flat_, vec3(0.25, 0.85, 1.0), showBorder);
    gl_FragColor = vec4(linearToSrgb(flat_), 1.0);
    return;
  }

  // ---------------------------------------------------------------------
  // Virtual camera
  //
  // The sphere has radius 1, so seen from distance d its silhouette has an
  // angular radius of asin(1/d), which lands at tan(asin(1/d)) / tan(halfFov)
  // on the film. Pinning that to uFill solves for the camera distance, so the
  // globe keeps the same on-screen size while the fov changes -- a dolly zoom.
  //
  // Narrow fov pushes the camera far away and converges on an orthographic
  // globe showing very nearly a full hemisphere. Wide fov crowds in, so you
  // see a smaller cap blown up, with the limb falling away much faster.
  // ---------------------------------------------------------------------
  float halfFov = 0.5 * uFov;
  float silhouette = atan(uFill * tan(halfFov)); // angular radius we want
  float camDist = 1.0 / sin(silhouette);

  vec3 rayOrigin = vec3(0.0, 0.0, camDist);
  vec3 rayDir = normalize(vec3(film * tan(halfFov), -1.0));

  SphereHit hit = intersectUnitSphere(rayOrigin, rayDir);

  // Antialias the limb straight off the discriminant: it crosses zero exactly
  // at the silhouette, so one screen-space derivative gives us a clean edge.
  float edge = fwidth(hit.discriminant);
  float coverage = smoothstep(-edge, edge, hit.discriminant);

  vec3 geoNormal = hit.normal;
  vec3 viewDir = -rayDir;

  // ---------------------------------------------------------------------
  // Texture lookup
  //
  // Undo the globe's orientation to get the direction in map space, then read
  // it as latitude / longitude.
  // ---------------------------------------------------------------------
  vec3 mapDir = rotateY(rotateX(geoNormal, -uTilt), -uSpin);
  vec2 uv = directionToEquirect(mapDir);

  vec2 dUVdx = unwrapDerivative(dFdx(uv));
  vec2 dUVdy = unwrapDerivative(dFdy(uv));

  vec3 albedo = textureGrad(uDayMap, uv, dUVdx, dUVdy).rgb;
  vec3 lights = textureGrad(uNightMap, uv, dUVdx, dUVdy).rgb;
  float water = textureGrad(uWaterMap, uv, dUVdx, dUVdy).r;
  vec3 normalTexel = textureGrad(uNormalMap, uv, dUVdx, dUVdy).rgb;

  // Perturb in map space, where the tangent frame is trivial, then rotate the
  // result back out to the shading frame.
  vec3 bumped = applyNormalMap(mapDir, normalTexel, uNormalStrength, uFlipNormalGreen);
  vec3 normal = rotateX(rotateY(bumped, uSpin), uTilt);

  // ---------------------------------------------------------------------
  // Shading
  // ---------------------------------------------------------------------
  float lambert = sunLambert(normal, uSunDir, uTerminator);

  // Only water glints, hence the mask.
  float specular = blinnSpecular(normal, uSunDir, viewDir, uShininess)
                 * uSpecular * water * lambert;

  // Rim follows the silhouette, not the bumps.
  float rim = fresnelRim(geoNormal, viewDir, uRimPower) * uRimStrength;
  float rimLit = rim * mix(0.12, 1.0, lambert); // atmosphere glows on the day side

  vec3 shaded = albedo * mix(uNightLevel, 1.0, lambert)
              + lights * uNightLights * (1.0 - lambert)
              + vec3(specular)
              + uRimColor * rimLit;

  // ---------------------------------------------------------------------
  // Debug views
  // ---------------------------------------------------------------------
  vec3 color;
  if (uMode == MODE_ALBEDO) {
    color = albedo;
  } else if (uMode == MODE_NORMALS) {
    color = normal * 0.5 + 0.5;
  } else if (uMode == MODE_RIM) {
    color = uRimColor * rim;
  } else if (uMode == MODE_MASK) {
    color = vec3(1.0);
  } else if (uMode == MODE_UV) {
    float checker = mod(floor(uv.x * 24.0) + floor(uv.y * 12.0), 2.0);
    color = vec3(uv, 0.35) * mix(0.55, 1.0, checker);
  } else if (uMode == MODE_LIGHT) {
    color = vec3(lambert);
  } else {
    color = shaded;
  }

  // Lat / long lines, on top of anything that has a uv.
  if (uGraticule > 0.5 && uMode != MODE_NORMALS && uMode != MODE_MASK) {
    float width = 1.5 * max(length(vec2(dUVdx.x, dUVdy.x)), 1e-6);
    color = mix(color, vec3(0.9, 1.0, 1.0), graticule(uv, width) * 0.6);
  }

  float alpha = coverage;

  // The quad itself, so you can watch the illusion come apart when you turn it.
  if (uPlaneBounds > 0.5) {
    color = mix(vec3(0.09, 0.11, 0.16), color, alpha); // faint film behind the globe
    alpha = max(alpha, 0.22);
    color = mix(color, vec3(0.25, 0.85, 1.0), showBorder);
    alpha = max(alpha, showBorder);
  }

  gl_FragColor = vec4(linearToSrgb(color), alpha);
}
