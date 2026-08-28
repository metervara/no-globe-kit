// Equirectangular ("plate carree" / lat-long) mapping.
//
// This is the classic world-map layout: x spans 360 degrees of longitude,
// y spans 180 degrees of latitude, so the image is always 2:1.

// Due east at a point on the sphere: the +u direction of the map, and the
// tangent both the normal mapping and the wind field are built on.
vec3 sphereEast(vec3 dir) {
  vec3 east = cross(dir, vec3(0.0, 1.0, 0.0));
  float len = length(east);
  return len < 1e-4 ? vec3(1.0, 0.0, 0.0) : east / len; // undefined at the poles
}

vec2 directionToEquirect(vec3 dir) {
  return vec2(
    atan(dir.z, dir.x) / TAU + 0.5,          // longitude -> u
    asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5 // latitude  -> v
  );
}

// u jumps from 1 back to 0 at the antimeridian. The GPU's implicit derivative
// sees that jump as an enormous step, picks the smallest mip level and draws a
// blurry seam down the globe. Unwrapping the derivative removes it.
vec2 unwrapDerivative(vec2 d) {
  if (abs(d.x) > 0.5) d.x -= sign(d.x);
  return d;
}

// Latitude / longitude lines every 15 degrees, with the equator and the prime
// meridian drawn thicker. Widths are in uv units so the lines stay even.
float graticule(vec2 uv, float width) {
  vec2 cells = vec2(24.0, 12.0); // 360/15, 180/15
  vec2 f = fract(uv * cells);
  vec2 d = min(f, 1.0 - f) / cells;

  float minor = 1.0 - smoothstep(0.0, width, min(d.x, d.y));
  float major = 1.0 - smoothstep(0.0, width * 2.0,
                                 min(abs(uv.y - 0.5), min(uv.x, 1.0 - uv.x)));

  return max(minor * 0.45, major);
}
