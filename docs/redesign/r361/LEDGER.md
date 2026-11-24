<!-- coderabbit-ai-generated:v1 -->

# r361 delivery ledger

- P0 baseline — inspected `dd8c11aa9889`; production reports this build, database healthy, colleges HTTP 200. Git transport and Actions reads work. CI 45492294614 failed; the previous round's verification does not cover this HEAD. [Command output](evidence/baseline.txt).

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7957f757f3b537be27270ed4438937d34c87ef3baab652babbe7b736b8897bc0 -->

- P1 institution audit: added the Arabic page title and removed invisible whitespace that broke lint on baseline 1bdddc1. [All 16 route-title tests passed](evidence/audit-title.txt); ESLint passed on the audit component.

NEXT: Inspect the baseline role captures and repair remaining CI failures.

<!-- /coderabbit-ai-generated:v1 -->
