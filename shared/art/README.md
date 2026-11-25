<!-- coderabbit-ai-generated:v1 -->

# Shared artwork

The registry in `manifest.ts` lists 44 keys with Arabic titles. The scene builders in `scenes/` draw the registered illustrations using the strokes, type and colors in `grammar.ts`. The desktop and phone elevations have separate compositions.

From the repository root:

- Run `node scripts/art/export-svg.mjs` to rebuild the standalone files in `shared/art/svg/`. To inspect one drawing, pass `--key hero-elevation`. A missing scene must fail the export. The runtime should never ship a scaffold in place of the registered scene.
- Run `node scripts/art/build-native.mjs` after editing a builder to refresh the native source copies and components.
- Run `bash scripts/art/check-art-colors.sh` and inspect the light and dark renderings. The standalone images carry their own theme palette. Their surrounding page supplies its own ink, paper and hairline colors.

The landing and the entrance animation share the same elevation URL. When reviewing a generated elevation, check the facade, floor bands, windows and trees. A framed rectangle is the old scaffold.
