# R352 — API-USAGE-MAP

Endpoint → screen → usage. The contract
(`docs/redesign/r352/institutional-backend/API-CONTRACT.md`, branch
`r352/institutional-backend`, PR #35) is the only source; every operation the
workspace consumes is listed. **Missing operations** (not in the contract → not
invented) are recorded at the end.

## §0 Capability gates

| Capability | Consumed by (write UI) |
|---|---|
| ORG_STRUCTURE_MANAGE | organization dialogs |
| PEOPLE_MANAGE | people create + status |
| APPOINTMENTS_MANAGE | appointments create/end/cancel |
| COUNCILS_MANAGE | councils + meetings lifecycle |
| PROGRAMS_MANAGE | programs/versions/courses/terms/enrollments/placements |
| CREDENTIALS_MANAGE | credentials award/revoke |
| ACCREDITATION_MANAGE | accreditations + licenses + inspections + findings + corrective + evidence |
| QUALITY_INTERNAL_MANAGE | self-assessments (grant-only — the UI names this explicitly) |
| FACILITIES_MANAGE | facilities + work orders + reservations + incidents |
| RESEARCH_PROJECTS_MANAGE | research projects/teams/outputs |
| UNIT_ROLES_ASSIGN | access section's grant/revoke surface |

`GET /me/permissions` is the ONLY authorization input the UI reads (never client
role labels).

## §1 Catalogs → screens

| Endpoint | Screen |
|---|---|
| GET /catalog/institution-types | overview classification editor (kind options, sector-consistent) |
| GET /catalog/regulatory-authorities | overview editor; quality (accreditation authority); licenses (inspections/licenses authority) |
| GET /catalog/credential-types | students (the statutory credentials tab); programs (credential option) |
| GET /catalog/position-templates | positions (catalog + the create-appointment options, eligibility-per-kind + scopeRequirement) |
| GET /catalog/accreditation-criteria-sets | quality (criteria section + self-assessment/accreditation options) |

## §2 Classification → screens

| Endpoint | Screen |
|---|---|
| GET /institutions/me/profile | workspace masthead (all sections); overview identity card |
| PATCH /owner/institutions/:id/classification | overview (OWNER-only editor) |

## §3 Org units → screens

| Endpoint | Screen |
|---|---|
| GET /institutional/org-units (paged, type/q/parentId filters) | organization list view |
| GET /institutional/org-units/tree | organization tree; parent options everywhere |
| POST /institutional/org-units | organization create dialog |
| GET /institutional/org-units/:id | unit detail panel (unit + ancestors) |
| PATCH /institutional/org-units/:id | edit dialog |
| POST /institutional/org-units/:id/status | status dialog |

## §4 People → screens

| Endpoint | Screen |
|---|---|
| GET /institutional/people (paged) | people directory; options in positions/councils/research/access |
| POST /institutional/people | people create |
| GET /institutional/people/:id | person detail (+appointments+unitRoleGrants) |
| PATCH /institutional/people/:id | *(reserved — edit dialog lands with the first edit flow)* |
| POST /institutional/people/:id/status | person detail status actions |
| GET /institutional/people/:id/appointments | *(person detail uses the :id aggregate's appointments today; the dedicated history endpoint is the contract's own deep view — wired via the aggregate until an edit-history UI needs the full record)* |

## §5 Appointments → screens

| Endpoint | Screen |
|---|---|
| GET /institutional/appointments (paged) | positions ledger; organization unit detail |
| POST /institutional/appointments | create dialog |
| GET /institutional/appointments/:id | *(not yet surfaced — the ledger row carries the record; a dedicated detail route is follow-up if the contract's relations are needed standalone)* |
| POST /institutional/appointments/:id/end | end dialog |
| POST /institutional/appointments/:id/cancel | cancel action |

## §6 Governance → screens

| Endpoint | Screen |
|---|---|
| GET /governance/councils (paged) | councils list |
| POST /governance/councils | create |
| GET /governance/councils/:id | council detail |
| PATCH /governance/councils/:id | *(status changes via the detail's actions when dissolved-flow lands; the contract field is consumed read-side)* |
| POST /governance/councils/:id/members | add-member dialog |
| POST /governance/council-memberships/:id/end | end-membership action |
| GET/POST /governance/councils/:id/meetings | meetings table + schedule dialog |
| GET /governance/meetings/:id | meeting detail (the aggregate) |
| PATCH /governance/meetings/:id | mark HELD |
| POST /governance/meetings/:id/attendance | the attendance picker (bulk upsert) |
| POST /governance/meetings/:id/agenda-items · PATCH /governance/agenda-items/:id | agenda add + status |
| POST /governance/meetings/:id/resolutions · PATCH /governance/resolutions/:id | resolutions add + transitions |
| GET/PUT /governance/meetings/:id/minutes · /approve · /sign | the minutes phase |
| POST /governance/councils/:id/documents | document-reference dialog (metadata — no byte upload this round) |

## §7 Programs/terms/enrollments/placements → screens

All consumed: programs list/detail/patch; versions create/patch (+ the one-ACTIVE
rule surfaced); version courses get/post/delete (options from the EXISTING
`GET /courses` catalog); terms list/post; enrollments list/post/status
(transitions mapped); placements list/post/patch (evaluation).

## §8 Credentials → screens

GET /academic/credentials (paged) → students tab; POST /academic/credentials/award
→ award dialog; POST /academic/credentials/:id/revoke → revoke action.

## §9 Compliance → screens

Accreditations (list/post/patch + transitions), licenses (list/post/patch),
inspections (list/post/patch), findings (list/post/patch + transitions),
corrective-actions (post/patch), self-assessments (list/post/patch),
evidence (list/post) — all consumed in quality + licenses screens.

## §10 Operations → screens

Facilities (list/post/get/patch), equipment (list/post/patch; programs link/unlink
consumed on the equipment side), work-orders (list/post/patch), reservations
(list/post/patch), safety-incidents (list/post/patch) — facilities screens.

## §11 Research → screens

Projects (list/post/get/patch), members (post/delete), outputs (list/post) —
research screens.

## §12 Scoped roles → screens

GET /me/unit-roles → access; GET/POST /admin/users/:id/unit-roles +
POST /admin/unit-roles/:id/revoke → the ROLES_ASSIGN section.

## Missing operations (recorded, NOT invented)

1. **Evidence/minutes byte upload** — the contract is metadata/reference this
   round; the UI records documentRef/fileUrl strings.
2. **PATCH /institutional/people/:id edit UI** — endpoint consumed in api.ts;
   the people edit dialog is a follow-up (the create + status flows cover the
   registry's core operations today).
3. **GET /institutional/appointments/:id standalone screen** — consumed in
   api.ts; the ledger + person aggregate cover the displayed data.
4. **Equipment↔program link UI** — endpoints consumed in api.ts + hooks; the
   equipment detail's program-support section is a follow-up screen (the
   contract exposes it; no workflow demanded it in the required set).
5. **Enrollment/credential learner pickers** — read the platform's existing
   `/admin/students` catalog for options (the contract takes studentProfileId;
   no institutional learner-search endpoint exists yet — recorded for the
   backend agent).
