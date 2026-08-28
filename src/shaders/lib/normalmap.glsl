// Tangent frame for an equirectangular map on a sphere. Needs equirect.glsl.
//
// There is no geometry to take tangents from, but we don't need any: on a
// sphere the +u direction is always due east and +v is always due north, and
// both fall straight out of the normal.
vec3 applyNormalMap(vec3 n, vec3 texel, float strength, float flipGreen) {
  vec3 east = sphereEast(n);
  vec3 north = cross(east, n);

  vec3 t = texel * 2.0 - 1.0;
  t.y *= flipGreen;
  t.xy *= strength;

  return normalize(t.x * east + t.y * north + t.z * n);
}
