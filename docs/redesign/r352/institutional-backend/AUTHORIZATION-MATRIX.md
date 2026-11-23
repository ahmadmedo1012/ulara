# R352 — Authorization Matrix (final closure §7, 2026-11-23)

The concrete role/capability/tenant-scope matrix, **proved from the
source and the regression belts** (not inferred). Every claim below has a
pinned test in `backend/tests/integration/` or `backend/tests/modules/`.

## 1. The capability layers (lib/permissions.ts mergeCapabilities)

```
effective(userId, role, contextInst?, orgUnit?) =
    DEFAULT_ROLE_CAPABILITIES[role]          (layer 1 — role defaults)
  ∪ RolePermission rows for that role         (layer 1 — operator-editable, 30s cache)
  ∪ UserPermission grants                     (layer 2 — global rows always; institution-scoped rows only in THAT context)
  ∪ UnitCapabilityGrant rows (context)        (layer 3 — institution-wide rows always; unit-scoped rows only for unit-targeted checks)
  − UserPermission revokes                    (deny precedence — an explicit revoke beats EVERY grant layer, deterministic)
```

- A unit-scoped grant adds EXACTLY ONE capability inside its subtree —
  it never counts for institution-wide operations
  (`assertCapabilityIn` counts only institution-wide rows).
- Global + same-institution rows are the ONLY UserPermission rows a
  context can see; other tenants' rows are invisible everywhere.

## 2. Default capabilities per role (DEFAULT_ROLE_CAPABILITIES)

| Role | Defaults |
|---|---|
| `STUDENT` | EXAMS_TAKE |
| `TEACHER` | RESEARCH_GRADE_OWN · RESEARCH_PUBLISH · EXAMS_AUTHOR · CURRICULUM_EDIT_OWN · ANNOUNCE_FACULTY · COMPETITIONS_RUN · EVENTS_RUN |
| `ADMIN` | USERS_MANAGE · ROLES_ASSIGN · TEACHERS_VERIFY · ANNOUNCE_PLATFORM/FACULTY · COMPETITIONS_RUN · EVENTS_RUN · CURRICULUM_EDIT_ANY · RESEARCH_PUBLISH · the 11 r352 institutional values (ORG_STRUCTURE/PEOPLE/APPOINTMENTS/COUNCILS/PROGRAMS/CREDENTIALS/ACCREDITATION/FACILITIES/RESEARCH_PROJECTS/UNIT_CAPABILITIES_MANAGE) — **no** grading, no EXAMS_AUTHOR/MODERATE, no QUALITY_VIEW |
| `QUALITY` | QUALITY_VIEW · QUALITY_REPORT · EXAMS_MODERATE · ANNOUNCE_FACULTY — **no** USERS_MANAGE, **no** ROLES_ASSIGN, **no** institutional-management values (QUALITY_INTERNAL_MANAGE is explicit-grant-only, D8) |
| `OWNER` | the FULL capability set (the pinned invariant) |

## 3. Tenant scope — the one governance rule (§3 closure, lib/governance.ts resolveGovernanceCallerContext)

| Caller | Governance scope on the capability-gated admin routes (`GET/POST /admin/users*`) |
|---|---|
| `OWNER` | **The ONLY platform-wide path** (null context BY DEFINITION — the documented platform governance view; sees the cross-tenant trail; writes the platform-GLOBAL UserPermission row — the only path that can mint one) |
| every other role — ADMIN, QUALITY, **TEACHER, STUDENT (capability holders via explicit grants included)** | **DB-verified ACTIVE institution context REQUIRED**: no context → 403 `INSTITUTION_CONTEXT_REQUIRED` (fail closed — never a silent fall-through to the platform-wide scope); stale/revoked/suspended/forged claim → 403 `INSTITUTION_CONTEXT_INVALID`. Their listing is pinned to their institution; their writes land **institution-scoped** (never a platform-global row); cross-institution targets: 404 on reads (existence never leaks), 403 on writes. |

A capability grant — institution-scoped override, **or even a
platform-global override** — satisfies the capability gate but NEVER
widens a non-OWNER into the platform-wide path (the pre-fix defect:
non-ADMIN/QUALITY roles fell through to `callerInstitution = null` =
the OWNER scope).

## 4. Context lifecycle behavior (resolveCallerInstitutionScope)

| Situation | Result |
|---|---|
| Contextless session (no `inst` claim) | non-OWNER → 403 REQUIRED on institutional surfaces; OWNER → platform-wide by definition |
| Membership revoked, claim still in token | 403 `INSTITUTION_CONTEXT_INVALID` (loud, never silent downgrade) |
| Institution `SUSPENDED`/`CLOSED` | 403 `INSTITUTION_CONTEXT_INVALID` |
| Forged / nonexistent institution id | 403 `INSTITUTION_CONTEXT_INVALID` |
| `select-institution` → active membership in ACTIVE institution | the verified context (re-verified against the DB on EVERY request — the JWT claim alone is never trusted) |

## 5. `User.role` vs `Membership.role` (the architectural boundary, as-implemented)

- `User.role` is the **platform identity** baseline: OWNER is a global
  platform identity with no membership by design; the role defaults
  (layer 1) and role-pinned guards (`requireRole`) read it.
- `Membership.role` is the **institutional membership** record: the
  per-institution role of the same name, read by the profile/scoping
  surfaces (memberships list, the effective membership role in
  `/me/permissions`).
- The capability model is the extension mechanism BETWEEN them:
  institution-scoped `UserPermission` + `UnitCapabilityGrant` rows grant
  authority inside exactly one tenant; platform-global rows exist only
  where the OWNER minted them.
- **No rewrite was made in the final closure** (web/mobile
  compatibility): the distinction stays exactly as implemented, now
  documented precisely and pinned by
  `permissions-governance-scope.test.ts` (the §3 belt: a STUDENT with
  institution-scoped grants operates strictly inside their tenant; a
  global override holder is still context-bounded).

## 6. File/storage authority (§11)

| Caller | Lecture/material/paper bytes |
|---|---|
| OWNER | platform-wide oversight (by the shared contract) |
| Same-institution ADMIN/QUALITY | allowed — via the DB-verified context AND the offering→course→institution chain (`assertOfferingInCallerInstitution`; the §6 closure added it to the lecture stream — foreign oversight 404s) |
| Offering's TEACHER / actively-enrolled STUDENT | per-row grant (no institution re-check needed — the row IS the tenant binding) |
| Contextless institutional caller | 403 REQUIRED before ANY storage touch |
| Foreign-institution caller (any shape) | 403/404 — never a byte (real-bytes proof: `lecture-video-bytes.test.ts`) |

## 7. The evidence belts (measured, not claimed)

| Belt | Proves |
|---|---|
| `tests/integration/permissions-governance-scope.test.ts` (20) | the §3 matrix end-to-end: OWNER platform path preserved; ADMIN/QUALITY institutional paths preserved; STUDENT/TEACHER capability holders bounded; global-override holder context-refused; revoked/suspended/forged contexts; cross-institution writes leave ZERO rows/audit entries |
| `tests/integration/permissions-effective-scope.test.ts` (6) | effective ↔ overrides scope agreement, deny precedence, unit-grant semantics |
| `tests/integration/compliance-scope-refs.test.ts` (27) | the §4 per-field scope-reference validation + the DTO invariant |
| `tests/integration/r352-cross-tenant-writes.test.ts` | the broader cross-tenant write belt |
| `tests/integration/lecture-video-bytes.test.ts` (12) | real-byte authorization across two institutions (not absent-object 404s) |
| `tests/modules/test-accounts-production-policy.test.ts` (12) | the §5 production test-account policy matrix + zero-writes proof |
| `tests/modules/auth-test-accounts.test.ts` (14) | the table invariants + non-production heal behavior |
