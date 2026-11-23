# R352 — SCREEN-MATRIX

Every screen, its route, its data sources (contract sections), its write gates, and
its states. All states = loading/empty/error/403/context-required unless noted.

## The workspace frame

| Screen | Route | Data | Writes |
|---|---|---|---|
| Workspace layout | `/institution/**` (parent) | GET /institutions/me/profile; GET /me/permissions | — |
| Hidden-module explanation | deep-link to a kind-hidden section | moduleHiddenReason | — |

## A. Overview

| Screen | Route | Data | Writes |
|---|---|---|---|
| Institution overview | `/institution` | profile; org-units/people/licenses `meta.total` summaries; licenses list (limit 5) | PATCH /owner/institutions/:id/classification (OWNER-only editor dialog) |

## B. Organization

| Screen | Route | Data | Writes |
|---|---|---|---|
| Tree view | `/institution/organization` | GET /institutional/org-units/tree | create/edit/status dialogs (ORG_STRUCTURE_MANAGE) |
| List view | (toggle) | GET /institutional/org-units?type&q&status (paged) | same dialogs; row → tree selection |
| Unit detail panel | (selection / ?unit=) | GET /institutional/org-units/:id (+ancestors); people?orgUnitId; appointments?orgUnitId; programs?orgUnitId | edit / status / add-child |

## C. People

| Screen | Route | Data | Writes |
|---|---|---|---|
| Directory | `/institution/people` | GET /institutional/people?category&status&q (paged); org-unit tree (options) | create dialog (PEOPLE_MANAGE) |
| Person detail | `/institution/people/:id` | GET /institutional/people/:id (+appointments+unitCapabilityGrants) | status transitions (PEOPLE_MANAGE) |

## D. Positions & appointments

| Screen | Route | Data | Writes |
|---|---|---|---|
| Appointments ledger | `/institution/positions` | GET /institutional/appointments?status (paged); position templates; people (options); org tree (scope-aware options) | create appointment / end (dialog) / cancel (APPOINTMENTS_MANAGE) |
| Position catalog | (section) | GET /catalog/position-templates (eligible-per-kind, local variants flagged) | — |

## E. Access

| Screen | Route | Data | Writes |
|---|---|---|---|
| My access | `/institution/access` | GET /me/permissions; GET /me/unit-capabilities; org tree | — |
| User grants (UNIT_CAPABILITIES_ASSIGN) | (section) | GET /admin/users/:id/unit-capabilities?institutionId | POST grant (dialog) / revoke |

`?institutionId` on the admin grant list is honored for OWNER only — non-OWNER callers are always scoped to their server-verified institution.

## F. Councils

| Screen | Route | Data | Writes |
|---|---|---|---|
| Councils list | `/institution/councils` | GET /governance/councils?type&status (paged) | create council (COUNCILS_MANAGE) |
| Council detail | `/institution/councils/:id` | GET /governance/councils/:id (+memberships); meetings list | add member / end membership / schedule meeting / add document ref |
| Meeting detail | `…/:id/meetings/:meetingId` | GET /governance/meetings/:id (agenda+attendance+resolutions+minutes) | mark HELD; agenda add/status; bulk attendance; resolutions add + transitions; minutes draft→approve→sign |

## G. Programs & learners

| Screen | Route | Data | Writes |
|---|---|---|---|
| Programs ledger | `/institution/programs` | GET /academic/programs?kind&status (paged); GET /academic/terms; credential types | create program / create term (PROGRAMS_MANAGE) |
| Program detail | `/institution/programs/:id` | GET /academic/programs/:id (+versions); version courses; GET /courses (the existing catalog, link options) | program status; create version; version transitions; link/unlink course |
| Placements | `/institution/training` | GET /academic/training-placements?status (paged) | create placement; evaluation dialog (status/score/summary) |
| Students | `/institution/students` | GET /academic/program-enrollments (paged); GET /academic/credentials (paged); credential-type catalog; programs; /admin/students (learner options) | enroll; enrollment transitions (PROGRAMS_MANAGE); award/revoke credential (CREDENTIALS_MANAGE) |

## I. Quality & compliance

| Screen | Route | Data | Writes |
|---|---|---|---|
| Quality | `/institution/quality` | GET /compliance/self-assessments; GET /compliance/accreditations?type&status; GET /catalog/accreditation-criteria-sets; GET /compliance/evidence | self-assessment create+transitions (QUALITY_INTERNAL_MANAGE); accreditation create+transitions + evidence (ACCREDITATION_MANAGE) |
| Licenses & inspections | `/institution/licenses` | GET /compliance/licenses; GET /compliance/inspections; GET /compliance/findings?severity&status (+correctiveActions when returned); authorities; people | license create+transitions; inspection create+transitions; finding create+transitions; corrective-action dialog (ACCREDITATION_MANAGE) |

## J. Facilities

| Screen | Route | Data | Writes |
|---|---|---|---|
| Facilities ledger | `/institution/facilities` | GET /operations/facilities?type&status (paged); GET /operations/equipment?status (paged) | create facility (FACILITIES_MANAGE) |
| Facility detail | `/institution/facilities/:id` | GET /operations/facilities/:id; equipment?facilityId; work orders; reservations; safety incidents | work-order dialog; reservation request/approve/reject; incident dialog |

## K. Research

| Screen | Route | Data | Writes |
|---|---|---|---|
| Projects ledger | `/institution/research` | GET /research-projects?status (paged); GET /research-outputs?type (paged); org tree; people | create project; add output (RESEARCH_PROJECTS_MANAGE) |
| Project detail | `/institution/research/:id` | GET /research-projects/:id (+members) | status transitions; add/remove team member |

## Visibility rules

- All sections render for every institution member EXCEPT research, hidden for
  `INTERMEDIATE_TECHNICAL_INSTITUTE` and `VOCATIONAL_TRAINING_CENTER` (Law 21/2023
  Art. 4 stages 1–2 carry no research mandate — LEGAL-MATRIX §A.3). Deep-links to
  hidden sections render the explanation, not a redirect.
- Write affordances per the capability table in API-USAGE-MAP.md.
