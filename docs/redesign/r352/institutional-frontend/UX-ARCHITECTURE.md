# R352 — UX ARCHITECTURE

## The mental model

One workspace, thirteen coherent sections, one visual language. The user is a member
of an institution running an educational/training operation; the workspace speaks
the institution's legal vocabulary (الجهة المانحة، قرار الإنشاء، إذن المزاولة،
المجلس العلمي، الدبلوم التقني العالي…) — never generic admin jargon
("Administrator" for every leadership position, "isAccredited" traffic lights).

## Composition hierarchy

```
AppShell (the platform shell — untouched)
└── InstitutionWorkspaceLayout (inst-layout)
    ├── inst-rail (nav — sticky chip strip ≤920px / 220px column ≥921px)
    └── inst-main
        ├── inst-masthead (institution kind · sector · status chip)
        └── <Outlet/> → the section page
            ├── PageHeader (title, eyebrow, description, meta actions, breadcrumbs)
            ├── inst-filters (search + selects, 44px floors)
            ├── the section body (inst-section cards / .table.tbl-stack / tree)
            └── dialogs (inst-dialog, config-driven forms)
```

- Detail workflows get **their own routes** (people/:id, councils/:id,
  councils/:id/meetings/:meetingId, programs/:id, facilities/:id, research/:id) —
  deep-linkable, title-covered — never monolithic tab soup.
- The org chart is the one inline detail (tree selection → detail panel with
  ancestors + the unit's people/appointments/programs) — hierarchy browsing stays
  in one glance.

## The 13 sections and their grammar

| Section | Route | Anatomy |
|---|---|---|
| نظرة عامة | `/institution` | stat links → legal identity card → licenses summary |
| الهيكل التنظيمي | `/institution/organization` | tree ⇄ list toggle; unit detail panel |
| الأفراد والكوادر | `/institution/people` | statutory-family filter + status; person detail route |
| المناصب والتعيينات | `/institution/positions` | appointments ledger + the position catalog by category |
| الصلاحيات والأدوار | `/institution/access` | role/membership/grants separation + capability chips |
| المجالس واللجان | `/institution/councils` (+2 detail routes) | memberships; the meeting's ٤ phases |
| البرامج والخطط | `/institution/programs` (+detail) | programs ledger + terms; versions + plan courses |
| التدريب العملي | `/institution/training` | placements ledger + evaluation dialog |
| الطلاب والمتدربون | `/institution/students` | enrollments tab ⇄ credentials tab (+ the credential-type catalog) |
| الجودة والاعتماد | `/institution/quality` | ٤ numbered sections: internal self-assessment / external accreditation / criteria sets / evidence |
| التراخيص والتفتيش | `/institution/licenses` | ٣ numbered sections: licenses / inspections / findings+corrective |
| المعامل والموارد | `/institution/facilities` (+detail) | facilities + equipment ledgers; the facility detail (equipment/work orders/reservations/safety) |
| البحث المؤسسي | `/institution/research` (+detail) | projects ledger + outputs; the project detail (team) |

## State grammar (identical everywhere)

- **Loading** → the platform's ListSkeleton.
- **Empty** → EmptyState with an actionable Arabic sentence.
- **Error** → the shared ErrorState (network vs server distinction, retry).
- **403** → the shared PermissionDeniedState (the server's own message).
- **No institution context** → the honest «اختر مؤسستك أولاً» card (contract §0:
  reads need a verified membership).
- **Success** → toast (context-specific Arabic copy at the call sites).

## Write-gating UX

Actions never render "disabled with a lock" — they simply don't exist until the
server's effective capability set grants them (`/me/permissions`). Where the
contract explains WHY a user lacks something (e.g., QUALITY_INTERNAL_MANAGE is
grant-only), the section carries a one-line `inst-cap-note` naming the capability.
The frontend is never the security authority.

## RTL & density

- Logical properties everywhere; letter-spacing 0; Arabic line-height floors.
- Tables stack on ≤560px via the platform's `data-label` contract.
- 44px tap floors on every interactive element; focus rings from the token system.
- Motion: the platform's `--t-*`/`--ease-*` only; reduced-motion kills the
  workspace's own transitions; no decorative animation in administrative flows.
