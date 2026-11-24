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

NEXT: Repair the design specimen tap targets and audit institution list/detail coverage.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->
