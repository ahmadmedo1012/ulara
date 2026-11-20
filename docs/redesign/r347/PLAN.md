# R347 — PLAN (the landing's last screenshots retire)

## The mandate

The owner's phase-4 directive (carried from r346, re-affirmed live): the
homepage's remaining screenshot captures are ugly and do not explain the
project — every picture on the landing becomes a 3D isometric drawing /
geometric shape in the reference's plate language (heronaiapp.com: the
drafting-sheet metaphor; the product subject is *something being drawn*,
never *something being screenshotted* — the live VLM critique of both
bands, r347).

r346 already retired the flat art in hero/journey/pains/why. TWO seats
still mount real UI captures:

| seat | file | the retiring captures |
|---|---|---|
| `[05] المنصّة فعليًا` (platform band) | `sections/Product.tsx` | `exam-active.webp`, `ai-tutor.webp` (the `.pr-img` desktop pair + `.pr-rowimg` stacked band) |
| `[07] الأدوار` (roles band media deck) | `sections/Roles.tsx` | the 8-slide `/media/product/*` deck (`rl-slide > img`) |

## Wave A — the platform band's two plates (`plates/ProductPlates.tsx`)

Two self-running isometric machines (pure-CSS loops, the WhyPanels
recipe — zero JS ticks), mounted in the SAME `.pr-img` / `.pr-rowimg`
frames (the `data-spec` seats keep their names, the occupant becomes an
`<svg>`):

- **P1 قاعة الاختبار (the exam runner)** — the exam slab with the
  sweeping timer dial, objective cells auto-ticking in sequence, and the
  essay sheet's dashed route flowing to the professor's desk (NOTE tag).
  The retired DOM callouts (`PrCallouts`) re-seat as the plate grammar's
  native in-SVG leaders (المؤقّت · التصحيح التلقائي · المقالة إلى الأستاذ).
- **P2 برج المساعد (the academic assistant)** — the assistant core
  tower with its orbiting knowledge ring, the student's question node
  popping, the staged answer lines drawing out, the review-plan chip
  landing (خطة مراجعة).

The frame chrome keeps its seat; the demo-data chip («بيانات العرض
التجريبية») retires for these two frames — a drawing is not demo data —
and the seat tells the truth: «رسم تخطيطي توضيحي». The `.pr-co` callout
CSS family retires with its last consumer (dead CSS is a coverage-gate
finding).

## Wave B — the roles deck's eight plates (`plates/RolePlates.tsx`)

The 8-slide media deck cross-fades the SAME way (`.rl-slide` transform/
opacity law untouched) but every slide is an isometric role machine,
each a DIFFERENT composition (the jscpd law):

| # | role | the machine |
|---|---|---|
| 01 | الطالب | the personal journey path — checkpoints popping, the inked progress crawling, the mastery flag |
| 02 | الأستاذ | the builder desk — lecture/exam slabs stacking, grading ticks landing on the flowing submissions |
| 03 | المسجل العام | the registry tower — the institution plinth, college wings filing in, the permissions key |
| 04 | ضمان الجودة | the isolation vaults — three walled compounds (every institution sealed alone), flags, one compliance ledger |
| 05 | مالك المنصّة | the governance vault — the master audit ledger extending, the separated role keys orbiting |
| 06 | الباحث | the writing desk — the PDF stack, the hovering scan lens, the professor's copper margin marks |
| 07 | مشرف المعمل | the virtual-labs shelf — sealed boxes under dashed seals that never open (the honest «قيد التطوير»), the browsing lens |
| 08 | وليّ الأمر | the honest absence — the student report sheet slides, the guardian frame stays dashed and never fills (لا حساب منفصل) |

The deck's meta note re-seats honestly: the slides are diagrams now
(«مخطط لسطح الدور — رسم توضيحي», never a claim of real UI).

## Wave C — the honest residuals of the swap

- `ProductFrame.tsx` / `product-frame.css` / `assets/product/*` /
  `public/media/product/*` STAY in the tree (CampusPages still mounts
  ProductFrame; the captures remain the inner pages' own voice — only
  the LANDING sheet goes all-plates).
- The bundle gate re-measured after the swap (the r345 ceiling stood at
  753.7/770 KB gz; the plates must land under the ceiling — real code
  cuts if the seats push past).

## Gates

`verify.sh --fast` (tsc · vitest · bundle · css ratchet · a11y floor) +
live browser captures at 1440/1024/390 + the platform/roles e2e laws
(`.rl-chip` census, the r306 sheet pins). Commit ladder on main, pushed
after every completed sub-step (the owner's live-project law).
