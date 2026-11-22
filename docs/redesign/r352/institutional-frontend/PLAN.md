# R352 — Institutional Operating Workspace (Frontend) — PLAN

> Branch: `r352/institutional-frontend` (from `origin/main` @ `5892504e98a620fdba7a5d10ac871e432ef514d2`).
> Companion backend PR: **#35** (`r352/institutional-backend`) — the API contract
> (`docs/redesign/r352/institutional-backend/API-CONTRACT.md`) is the consumed source of truth.
> This PR is frontend-only; ownership: `frontend/**` + this directory.

## Objective

A distinct, professional **Institutional Workspace** (`/institution/**`) inside ULARA's
existing authenticated shell: the institution's own structure, people, governance,
programs, compliance, facilities and research — Arabic-first, fully RTL, real
workflows against the backend contract. NOT attractive mockups.

## Deliverables (all landed in this branch)

1. **Contract layer** — `lib/institutional/{types,labels,api}.ts` + `hooks/institutional/queries.ts`:
   DTOs field-for-field from the contract; one typed function per operation; the Arabic
   label registry; institution-scoped query families; the `useInstActions` mutation
   dispatcher.
2. **Workspace shell** — `components/institutional/{modules,shell}.tsx`: the 13-section
   registry (routes, icons, capability gates, the single documented kind rule), the
   rail nav + institution masthead, inside the platform's AppShell (no shell redesign).
3. **The 13 modules** — `pages/institutional/*.tsx`: overview, organization, people
   (+ person detail), positions, access, councils (+ council + meeting detail),
   programs (+ program detail), training, students, quality, licenses, facilities
   (+ facility detail), research (+ project detail).
4. **Integration** — `routes.ts` seats, `App.tsx` lazy route block
   (ADMIN|OWNER|QUALITY), `nav.ts` entries, AppShell titles.
5. **Tests** — 36 unit tests + 5-journey hermetic e2e + the visual-capture instrument.
6. **This documentation set** — the 9 required documents.

## Key decisions

| # | Decision | Why |
|---|---|---|
| D1 | Sections gated by **capability for writes**; kind-rule only for research | The contract makes reads context-reads (any active member); the backend LEGAL-MATRIX §A.3 (Law 21/2023 Art. 4 stages 1–2) is the only kind-visibility source used — no invented policy |
| D2 | Statutory names NEVER hardcoded | Credential types, position templates, criteria sets, authorities, institution kinds all render from `/catalog/*`; only fixed ENUM vocabulary is in `labels.ts` |
| D3 | Server-authoritative UI | Write buttons appear only when `/me/permissions` grants the capability; 403/404/409 render the server's Arabic messages verbatim; the client only catches the obvious |
| D4 | One mutation dispatcher (`useInstActions`) | Bundle diet: replaces ~22 hand-rolled hook objects; one `useMutation`, family invalidation |
| D5 | The platform's existing components | PageFrame/PageHeader/patterns, `.table.tbl-stack`, TablePaginationFooter, States, Icon, toast — no second design system |
| D6 | Mount for ADMIN, OWNER, QUALITY | Institutional reads are context reads (contract §0); QUALITY's read-only oversight + internal-QA grant-only semantics preserved |

## Non-goals (recorded, not silently dropped)

- Native mobile app screens (PR #32 owns `apps/mobile/**`) → HANDOFF follow-up.
- File byte-upload for evidence/minutes (contract is metadata/reference this round) → HANDOFF.
- Bundle-ceiling accommodation → measured overage documented for the lead's gate decision (see LOG).
