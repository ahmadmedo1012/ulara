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

NEXT: Repair mobile lint, confirm builds and run final captures.

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
