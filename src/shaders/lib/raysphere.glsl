// Analytic ray / unit-sphere intersection.
//
// The sphere is always radius 1 and centred on the origin -- everything else
// (framing, apparent size) is handled by where we put the virtual camera, so
// the intersection itself stays this short.

struct SphereHit {
  float discriminant; // > 0 inside the silhouette, < 0 outside. Used for AA.
  float t;            // distance along the ray to the near hit
  vec3  point;        // hit position
  vec3  normal;       // surface normal (== point, for a unit sphere at origin)
};

SphereHit intersectUnitSphere(vec3 rayOrigin, vec3 rayDir) {
  // |rayOrigin + t * rayDir|^2 = 1, solved for the near root.
  float b = dot(rayDir, rayOrigin);
  float c = dot(rayOrigin, rayOrigin) - 1.0;
  float discriminant = b * b - c;

  // On a miss this clamps to the point on the ray closest to the centre,
  // which keeps the normal finite so the antialiased edge stays well behaved.
  float t = -b - sqrt(max(discriminant, 0.0));
  vec3 point = rayOrigin + rayDir * t;

  return SphereHit(discriminant, t, point, normalize(point));
}
