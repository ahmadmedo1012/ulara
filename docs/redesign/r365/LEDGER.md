# r365 — authenticated-match LEDGER

Mission: every page after login becomes the reference's product-grade twin (student, teacher, admin, quality, owner, institution, shared shell/primitives). Branch `r365/authenticated-match` — draft PR to `main`, merged only by the owner/integrator after `R365-FINAL`.

## Rules in force
- The reference's product grammar wins over repo prose rules; changed rules get one line of reason here.
- Never push to `main`; never force-push; merge `origin/main` into the branch at least hourly.
- "The reference" only — its name/domain/agency never appear anywhere.
- Baselines (tokens/openapi/a11y/stylelint/deadcode/surface) are regenerated from final sources in a late commit, never hand-merged.

## Ledger
- P0.1  branch created from origin/main; ledger + draft PR with the DO-NOT-MERGE notice. — DONE
- P0.2  route-map.md derived from routes.ts + App.tsx + nav.ts. — DONE
- P0.3  product-grammar.md (shell anatomy, the table, KPI band, dark info cards, chat-widget grammar) + the real product capture from the vendor docs as evidence (the analysis JSON scrubbed — the zero-trace gate flags any name-bearing text; the capture image itself stays). Live crawl blocked by the edge wall — recorded honestly. — DONE
- P0.4  capture harness (tests/e2e/r365-capture.e2e.ts, opt-in via R365_CAPTURE=1) — hermetic fixtures, all roles/themes/viewports. Baseline dashboards captured: all five carry the sheet grammar already (huge title, mono eyebrows, KPI hairline band, bracket indices); first defects: no delta flags on KPI cells, teacher dashboard bottom section renders empty, charts sparse. — DONE
- P1.1  the flat delta flag primitive (KpiItem.deltaDir + CSS triangle, additive) + DesignPage demo wiring. — DONE
- P1.2  student dashboard momentum strip lifted into the KPI-band register (huge numerals + flags), loading mirror re-seated on the .sg-kpis grid (CLS-safe handoff). — DONE
- P0.5  capture harness upgraded: h1-settle wait, reduced-motion from context, R365_ONLY subset filter, LONG-SHOT expansion (the shell scrolls in .content — fullPage needs the shell opened; pass-1 shots were viewport-only). Preview-based baseline matrix (built assets): 90 desktop-light + 90 desktop-dark + 95 phone-light shots. — DONE
- P0.6  quality-dashboard defect RESOLVED — the pass-1 skeleton was the dev-server chunk-compile race; built preview renders the full board (KPI band 5 cells, alerts flagged rows). — DONE

NEXT: P6 sweep — dark long-shot matrix re-capture, phone long-shots, run scripts/audit (contrast/overlap/tap-target), regenerate baselines late, update DESIGN.md prose, P7 finish (merge, verify, Ready, R365-FINAL).
- P3.1  teacher dense pages (5-a): GradesPage/StudentsListPage band mirrors, InviteCodesCard re-nested inside .page, the risk-row chrome RESTORED in ds-core.css §E (the flagged-rows register), intelligence numerics formatPct1. — DONE
- P3.2  teacher authoring (6-b): picker/review error+empty on the shared kit, live page on Button primitives, LiveSkeleton on the band anatomy, the warning member of the flat-flag ramp added; the exa-* CSS loss documented. — DONE
- P3.3  the exa-* anatomy RESTORED (7-c): 63 classes rebuilt in ds-core.css §B (hub rows, bank accordion, detail head, split/facts ledger, modal scaffolding unscoped) — the exam authoring grammar is real again; stylelint + raw-css gates pass. — DONE
- P4.1  admin/owner dense pages (5-b): admin students sheet mounts cold, digital page honest band + framed mirror, faculties/reports framed mirrors; owner users audited clean. — DONE
- P4.2  quality pages (6-a): the qlt-* oversight chrome RESTORED in patterns.css §3, framed mirrors, bdi numerics. — DONE
- P4.3  workspace A (7-a): people/organization/positions/access/overview — DataSheet registers, flat flags, the access KPI band, the honest license total. — DONE
- P4.4  workspace B (7-b): councils(+detail)/programs(+detail)/training/students — DataSheet conversions, wired pagination, SheetEmpty set, scope-gated bands. — DONE
- P4.5  owner tail (8-a): detail branches framed, feedback inbox RESTORED on the hairline register (fb-row chrome + canonical footers + shape-matched mirrors). — DONE
- P2.3  student long tail (9-a): profile/messages/alerts/calendar audited clean; catalog toolbar re-seated; vision indices honest. — DONE
- P2.4  exam runner + moderation (9-b): the navigator's bracket indices, mono timer/save-warn flat chips, moderation on the sheet grammar; governance matrix flat flags. — DONE
- EVIDENCE: sheets/ has 14 side-by-side sheets (dashboards ×5 pass-1 + pass-2 long-shots ×5 + wave-6 ×4); critiques/dashboards.md carries both passes with per-screen verdicts. The workspace's honest NO-INSTITUTION state captured (w6-inst-people).
