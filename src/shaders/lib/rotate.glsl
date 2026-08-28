// Minimal axis rotations. We only ever need two of them, so no matrices.

vec3 rotateX(vec3 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateY(vec3 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
