// Deliberately not PBR. One hardcoded sun, one soft terminator, one highlight
// and a fresnel rim -- enough to read as a planet, small enough to follow.

// Lambert with a widened day/night transition.
float sunLambert(vec3 normal, vec3 sunDir, float softness) {
  return smoothstep(-softness, softness, dot(normal, sunDir));
}

float blinnSpecular(vec3 normal, vec3 sunDir, vec3 viewDir, float shininess) {
  vec3 halfVec = normalize(sunDir + viewDir);
  return pow(max(dot(normal, halfVec), 0.0), shininess);
}

// 1 at the silhouette, 0 where the surface faces us. Stands in for atmosphere.
float fresnelRim(vec3 normal, vec3 viewDir, float power) {
  return pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), power);
}

// The renderer writes to an sRGB drawing buffer and our textures are decoded to
// linear when sampled, so we encode again on the way out.
vec3 linearToSrgb(vec3 c) {
  return mix(1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055,
             c * 12.92,
             step(c, vec3(0.0031308)));
}
