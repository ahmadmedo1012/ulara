<!-- coderabbit-ai-generated:v1 -->

# Shared design inputs

`design-tokens.json` defines the web and native scales. The full-motion base beat is 640 ms; reduced motion still resolves to zero on the web. Mobile and web read their respective generated files. After a token change, run `node scripts/tokens/build.mjs --check` from the repository root to check both outputs and the byte-for-byte logo parity. See the [art registry](art/README.md) for the 44 illustration keys.

## Verifying one release across platforms

Compare the deployed web status build ID with the leading twelve characters of the accepted Git commit. Compare the **full** source in the Android release body and the iOS build-info file with that commit. The Android signing certificate identifies the signer, and the native cache fingerprint identifies compatible build inputs; neither identifies a Git revision. Check the file checksums independently. See the [mobile verification procedure](../apps/mobile/README.md#build-and-verify-a-native-release).

The web deployment watches `frontend/`, `backend/`, `api/` and `shared/`; direct native builds watch `apps/mobile/` and `shared/`. Other workflow-specific paths are listed in the three workflow definitions. For a release without changes in their watched paths, a maintainer can dispatch the missing workflows against the accepted ref. Verify that the published artifacts have actually advanced before reporting a new release.
