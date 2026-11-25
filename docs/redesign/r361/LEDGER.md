<!-- coderabbit-ai-generated:v1 -->

# r361 delivery ledger

- P0 baseline — inspected `dd8c11aa9889`; production reports this build, database healthy, colleges HTTP 200. Git transport and Actions reads work. CI 45492294614 failed; the previous round's verification does not cover this HEAD. [Command output](evidence/baseline.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7957f757f3b537be27270ed4438937d34c87ef3baab652babbe7b736b8897bc0 -->

- P1 institution audit: added the Arabic page title and removed invisible whitespace that broke lint on baseline 1bdddc1. [All 16 route-title tests passed](evidence/audit-title.txt); ESLint passed on the audit component.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:03c0663c5dd22dac89582447d25fea8d600f32f124aced2e7e42d6a02f78af0e -->

- P1/P2 measurements after 6c43670: [landing and shell contracts](evidence/landing-contracts.txt) now pin the approved mobile art ratio, bundle budget and paper shade. Eight iPhone Chromium cases passed. [Mobile Lighthouse, live URLs](evidence/lighthouse-baseline.txt); home performance below target.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:358b9232fdc887dbef94f88c1050e4e325db413fdad9346ee89d72b155343e70 -->

- Size gate at 64da859: the merged design evidence totals 56.5 MiB. Raised the docs budget from 40 to 58 MiB to retain those proofs. The per-file and push limits remain in force. [Gate output](evidence/size.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:543adc737b99804a19061976550e408ed1853e7fe4856ff3bd25d69d2159fb94 -->

- P3: council and meeting upload forms now switch to direct storage above the deployment body limit (4 MiB on production). Single PUT and multipart completion use the existing governance contract. [12 client tests](evidence/governance-transfer.txt), including refusal and missing ETag; frontend test-tree typecheck passed. Production uses Postgres and refuses presigning. An S3 deployment must explicitly allow its storage origin in CSP and expose ETag through CORS; live S3 transfer is unverified.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5710d84093a298ddb05d7f4847684268241e52c9da116738212c74fbac7b023b -->

- P5 documentation: corrected the Android download page, operator rollback, deployment guide and contributor guide to describe upgrades by signed binary. SideStore already defaults to main. [Contract and test output](evidence/mobile-distribution.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d54a8ffde81225e6e4411155d023363b96a58e643ad40f73e990d7a517ae7abc -->

- P1 capture: seven [role and shell comparison sheets with observations](evidence/role-critique.md). Fixed institution context on session hydration and added HTTP response detection for fixture 501s; axe exceptions now appear as instrument failures. [Scoped overview rerun](evidence/institution-scan.txt): 4 cells, no detected defects. [Role baseline](evidence/role-baseline.json) is not a full-matrix pass.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c701b7f320c135292b48d650d4160ae95e3f1a10f7f117d8c8441640bc492a85 -->

- P2/P6: render the A2 hero SVG as an image instead of mounting two React drawings at startup. Preserve interactive stations and the fallback. The statement uses the A2 campus plan; the footer uses the A2 skyline. Removed the old asset directory and fixed the exported SVG dark palette cascade. [Tests, bundle and art scan](evidence/art.txt). Re-measured deadcode after the merged art library and consumer changes: 47 unused-file candidates, 19 exports and 220 types; these counts are debt, not removals.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:786133df10f9e25e1d39a3b42b11d9d3204617a90a450723cb4b8714ffb78f3f -->

- P1: the design gallery now loads the real sheet stylesheet; its six small targets clear the phone floor. The quality dashboard uses a full last row on phones. Of four original findings, the remaining alert is the gallery’s intentional invalid-password specimen. Updated the institutional journey to follow the council link and named register. All five journeys passed. [Focused rerun](evidence/product-rerun.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:11139661d947b30dfe8188e8082393c23649bf1874a38b4538eedd56c4b54b4c -->

- P4: 17 previously missing institution API paths now have explicit fixtures. Repaired org-tree envelopes and list field names; response errors reset between matrix cells. The 13-route phone sweep recorded no missing fixtures; the two remaining short record links were corrected and retested in both themes. [Measurements](evidence/institution-fixes.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:bb351aa3cb14fdba89adaa313f9f127a675ebf5f45ca0f5a371d549feaf35068 -->

- P2: [nine landing section comparisons and critique](evidence/landing-critique.md). The loaded phone page measures 4,980 px normally and 5,564 px with reduced motion. Fixed native image dragging intercepting station gestures (both failing midpoint cases now pass). Limited frame-by-frame style changes to the two progress fills. [Measurements and tests](evidence/landing-measures.txt); the first live SVG build scored 73/100 performance/accessibility 100, below target.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:e32a9bbc1357f000cdc3b560108d69cea541cecfc15d51084af4f1f93f0e3825 -->

P7 — Updated README, web palette and art guidance, deployment lineage, CI trigger table and open operator tasks; source checks: [docs](evidence/docs.txt). Previous landed item: f9791e2.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5a330caaab73604e36e45247c4fc7c8e8a4b6d6f41f1b4b65c31c671e8431106 -->

P5 — Mobile CI failed with seven lint errors in generated art. Fixed the source and generator: 0 errors, 50 existing warnings; mobile typecheck and endpoint contract both pass. [Evidence](evidence/mobile-art.txt); prior item cfacefc.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ee5dc42fdfb7cf52857c596fc2f8ec82261fa45aa774a70bdc535d1465395351 -->

P2 — The entrance now shares the responsive hero vector and reveals one image instead of animating hundreds of SVG nodes. 21 unit and 4 browser checks pass, including the timing, skip and reduced-motion contracts. [Evidence](evidence/entrance.txt); previous 0157526.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:795f5f2297aaf7740288918c999509e49d539bd7705a0bbfe50e83ee25323aa0 -->

P5 — After lint passed in Actions, mobile generated-code verification exposed stale favicon bytes. Regenerated from the canonical mark; icons, splash and token drift checks pass [locally](evidence/mobile-favicon.txt). Earlier native build 28eafbc was published to latest; this is not yet final-HEAD evidence.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f7e58e5c097a5226c912effb9bce609d8a7666c6c1b9a63ab63b54e07c3b9e7d -->

P1 — Reworked the four outstanding dashboard compositions and captured a second comparison [with observations](evidence/dashboard-revision.md). 16 scoped cells: 0 P0, 0 P1, 4 P2 round-mark findings. The capture tool now accepts an immutable build directory, so concurrent builds cannot delete its chunks. Previous item a88e6f0.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:2442f2f6a70e94b4678c08418e75f81483de9f6045e8236e3579dda08091419a -->

P1/P4 — Added populated council detail and meeting fixtures. [List, detail, table and form comparison](evidence/registers.md): [16 cells](evidence/registers.txt), no recorded defects on the isolated build. Previous dashboard item is in the preceding commit.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:89de4c9018104e168e2aa9acff4999f8a8c60e9066cd2e3435f7100404ac892d -->

P1/P4 — Square cursor and status marks, clearer campus link, focusable named table regions, phone calendar and faculty-link target fixes. [Fifty focused cells](evidence/materials.txt) with no detected defects. The earlier 24 public routes had one short campus link and 23 radius findings; the 25 admin routes also had notification counter radii. The native radius token remains unchanged.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:b6c49b5d690577d4ea37b86458f6f5956e37c70273d197bc902dc8c7244c8e4a -->

P5 — Mobile CI progressed past generated drift and found six expectations for the retired colors and motion durations. Re-pinned the four suites to the r359 shared tokens; the fixed-ground logo still uses its own original ink. All [48 assertions passed](evidence/mobile-jest.txt). Previous web item d19dd3a.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:b5ea6e73c37aa5aebc806d2cb58cc598934057ae127bea2bd7b562c02c606ccb -->

P8 — Ran the requested two full script invocations. The last run passed typecheck, 863.8 KB bundle, style, logo, accessibility (12 cells, no serious/critical), design gates and lint. It failed one of 3,098 unit tests on cold module readiness and could not reach the preview for 27 e2e tests. Fixed cold test setup and restarted Preview: all 12 camera assertions and all 27 affected e2e cases then passed separately. [Output](evidence/verification.txt). The complete script itself did not exit green.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:0048f6b44c134b89a139cb639811c5ada9dc12a23788d1a20bd33a578f5477c8 -->

P9 — Verified all six topic tips were ancestors of main and deleted their refs with an atomic lease. Remote and local now contain only main; zero open PRs; latest and builds-ledger retained. [Ref and PR reads](evidence/cleanup.txt). Smart HTTPS worked.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:a053ec341316a64a015f6fd14446b63ff671b7856c6e8eabd106baadc0090c79 -->

P2 — The challenges carousel no longer reconciles four offscreen diagrams on initial phone load. Its scroll and keyboard handlers now attach at section mount. The cold-entry/tap/resize probe and all five landing-instrument journeys passed. [Evidence](evidence/phone-carousel.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:8136b6e05543d3d5001923df89f1a4a144ae33a1af00eac9491ab5e7dc0d5cb9 -->

P1/P10 — 123 static routes in the first sweep; see [issue counts](evidence/first-sweep.txt). Enlarged teacher session links and owner activity controls; [30 revised cells](evidence/owner-teacher-targets.txt) reported zero defects. Settled landing remains 4,980 px. [Arabic delivery report](REPORT.ar.md). Previous landing change: 61938f4.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:6ee63c56185d8daaab717ba5b458d10e6decf7066974a20f87b09db587c6ff42 -->

P2 — On 61938f4 the production waterfall fetched both auth chunks while the reader was idle in the first seconds. Enforced the documented 15-second minimum; keyboard intent still warms both immediately. [Network proof, scores and 11 passing funnel tests](evidence/auth-warm.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:832d55d9d7a23b99a4ca76006db282b04fe3c733a955efcd8a7b7468c1e42175 -->

P1/P4 — Expanded the census to all 20 mounted detail templates and used a student session for competitions, vision and document viewing. [210 detail and competition cells](evidence/route-details.txt): zero missing fixtures or crashes; three mobile target groups exposed for repair. f5e5a3e delivered the deferred auth warm-up.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:98f27707720fa6b052684fcbf501d5eaf251f7f18e59a13faf3690b0d862136f -->

P1/P2/P9 — [Verified mobile repairs and bundle](evidence/phone-final.txt): 4,980 px normal / 4,976 px reduced motion at 390; static findings retain all their text. Lecture, exam and PDF tap targets pass the 40-cell rerun including landing. The lazy carousel split costs 865.2 KB across 188 chunks, so the total limit moves 865 → 866; entry remains 30.0 KB. Removed two obsolete tracked scan PIDs. Previous census e0b61f4.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:cd0b4a96bec65fd7778836964f2a2af6c714337ca1dbbb9ddfc9c0f0ebfb8641 -->

P3 — Real Chromium upload/attach/download exposed an aria-hidden table cell around the download action. Gave it a named action column. [Eight institution journeys](evidence/governance-roundtrip.txt), including exact PDF byte roundtrip and separate 501/503 states, pass. Corrected the mobile runbook deployment triggers and downgrade instructions. Previous mobile layout commit 3d12908.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:aa9219544c79ef5b923be7e1def6c223c84e2f2981d17c138b22caa14f401f3d -->

P4 — Verified that selecting dark in the expanded desktop sidebar survives a full reload, including the persisted mode and populated dashboard. [Browser evidence](evidence/theme-reload.txt). Fixed the obsolete rail setup in the test. Previous document fix: 1785615.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:cd0ac0c5881b0d64ecb3d9698f4251e4fb634f50e347b5219d2250a8e537a00c -->

P1/P2/P6/P10 — All 44 standalone artworks now use the six published scene modules; previously the exporter silently returned scaffold art. Re-export is byte-identical. Dark hero uses the same themed paper as its illustration. [Exporter and 20-cell proof](evidence/canonical-export.txt), [refreshed visual critiques](evidence/landing-critique.md), [Arabic report](REPORT.ar.md). Earlier signed Android a88e6f0 and unsigned iOS ef92ae1 have separate release receipts. Previous theme item d9cddcc.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:8c41000bd5e81efe8e98fec4b29e41ef7ad37da88af43c694489b06b42acbec0 -->

After 1b18759: production Lighthouse 77/86/92, accessibility 100 throughout. Repaired 24 drift findings at their CSS source, requested the matching elevation before React, aligned the installed and offline shell colors, and verified retry preserves the address. [Evidence](evidence/initial-paint.txt).

NEXT: Confirm the new deployed hash and Lighthouse; compare final signed APK and unsigned IPA source receipts, surface drift and full route results.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->
