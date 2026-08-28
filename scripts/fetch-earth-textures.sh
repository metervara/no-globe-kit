#!/usr/bin/env bash
# Downloads the built-in earth maps and resizes them to 2048x1024.
#
# The results are committed to public/textures/, so you only need this if you
# want to regenerate them (or bump the resolution -- see RES below).
# Uses `sips`, which ships with macOS.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=public/textures
TMP=$(mktemp -d)
RES_W=2048
RES_H=1024

fetch() { # url outfile
  echo "  $2"
  curl -sSL --fail -o "$TMP/$(basename "$1")" "$1"
  sips -s format jpeg -s formatOptions 85 -z "$RES_H" "$RES_W" \
    "$TMP/$(basename "$1")" --out "$OUT/$2" > /dev/null
}

echo "fetching earth maps -> $OUT"

# NASA Visible Earth, Blue Marble Next Generation (public domain).
fetch "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg" \
      earth-day.jpg

# NASA Earth at Night / Black Marble (public domain).
fetch "https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg" \
      earth-night.jpg

# Land/water mask and topographic normals, from the three.js example texture
# set (NASA-derived, via Planetary Visions).
fetch "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg" \
      earth-water.jpg
fetch "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg" \
      earth-normal.jpg

rm -rf "$TMP"
echo "done"
