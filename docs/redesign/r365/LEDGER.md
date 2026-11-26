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
- P0.3  product-grammar.md (shell anatomy, the table, KPI band, dark info cards, chat-widget grammar) + the real product capture from the vendor docs as evidence. Live crawl blocked by the edge wall — recorded honestly. — DONE
- P0.4  capture harness (tests/e2e/r365-capture.e2e.ts, opt-in via R365_CAPTURE=1) — hermetic fixtures, all roles/themes/viewports. Baseline dashboards captured: all five carry the sheet grammar already (huge title, mono eyebrows, KPI hairline band, bracket indices); first defects: no delta flags on KPI cells, teacher dashboard bottom section renders empty, charts sparse. — DONE
- P1.1  the flat delta flag primitive (KpiItem.deltaDir + CSS triangle, additive) + DesignPage demo wiring. — DONE
- P1.2  student dashboard momentum strip lifted into the KPI-band register (huge numerals + flags), loading mirror re-seated on the .sg-kpis grid (CLS-safe handoff). — DONE
- P0.5  capture harness upgraded: h1-settle wait, reduced-motion from context, R365_ONLY subset filter, LONG-SHOT expansion (the shell scrolls in .content — fullPage needs the shell opened; pass-1 shots were viewport-only). Preview-based baseline matrix (built assets): 90 desktop-light + 90 desktop-dark + 95 phone-light shots. — DONE
- P0.6  quality-dashboard defect RESOLVED — the pass-1 skeleton was the dev-server chunk-compile race; built preview renders the full board (KPI band 5 cells, alerts flagged rows). — DONE

NEXT: long-shot matrix re-capture running; then evidence sheets per role from long-shots; P2 page loops begin (student first) — merge origin/main hourly.
