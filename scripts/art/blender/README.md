# Blender hero render (r368)
Tooling (installed in /tmp only, never committed): Blender 3.6.19 LTS (GPL-3.0; the rendered image is our own output, not a derivative), ImageMagick `convert` (Apache-2.0-style licence).
Run: `blender -b -P hero.py -- /tmp/raw.png 1440 700 24` then `ink.sh /tmp/raw.png out.webp`.
Output committed: `frontend/src/assets/art-v2/hero-elevation-bl.webp` (~190 KB, desktop only; phones keep the vector). Procedural scene, no imported assets, no image-generation API.
