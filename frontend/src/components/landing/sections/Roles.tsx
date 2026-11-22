/* P2-0 (r335 split) → r347 — [7] الأدوار. The section keeps its frozen
 * reference spec structure (home-usecase-wrap.*.json): the hairline
 * full-bleed frame, the media pane + ruled accordion 50/50 split, the
 * eight rows (title + plus glyph; the first row open). The ONE r347
 * change: the media deck's 8 real captures (/media/product) retire —
 * every slide is now an ISOMETRIC ROLE MACHINE (plates/RolePlates.tsx:
 * the journey climb · the builder desk · the registry tower · the
 * isolation vaults · the governance vault · the writing desk · the
 * sealed shelf · the honest absence), the same plate grammar as the
 * rest of the landing sheet (the owner's phase-4 art law). The deck's
 * cross-fade law is untouched; the meta note tells the diagrams'
 * truth, never a claim of real UI.
 *
 * Honesty contracts kept from the r168b/r188 pins (verbatim lines):
 *  · «المعامل الافتراضية … دون تشغيل بعد» — the VR-labs slide draws
 *    sealed dashed boxes that never open (the catalog disclosure).
 *  · the five verified platform roles keep their real one-liners;
 *    the honest-absence personas keep theirs (the guardian slide
 *    draws the dashed empty seat — no separate account).
 *  · No funnel CTA here (the 5-register / 6-login counts stay).
 */
import { useState } from 'react';
import { ROLE_SLIDES } from '../plates/RolePlates';

/* ── The deck: the eight accordion rows, each with its role machine.
 * The five verified roles first (their lines are the ROLE_SHOWCASES
 * copy the r168b pins ride), then the three honest personas. */
interface RoleRow {
  num: string;
  title: string;
  line: string;
}

const ROLE_ROWS: RoleRow[] = [
  {
    num: '01',
    title: 'الطالب',
    line: 'رحلة تعلّم شخصية — من المحاضرة الأولى إلى الإتقان: جدول اليوم، والمهام، والتقدّم في مقرّر واحد.',
  },
  {
    num: '02',
    title: 'الأستاذ',
    line: 'بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب قسمًا قسمًا.',
  },
  {
    num: '03',
    title: 'إدارة المؤسسة',
    line: 'الكليات والأقسام والمقرّرات والصلاحيات، وتقارير حيّة عنها جميعًا.',
  },
  {
    num: '04',
    title: 'ضمان الجودة',
    line: 'مجالس الجودة ومؤشرات الالتزام — وكل مؤسّسة معزولة تمامًا عن غيرها.',
  },
  {
    num: '05',
    title: 'مالك المنصّة',
    line: 'الحاكمية والمؤسّسات وسجلّ التدقيق — والصلاحيات منفصلة دورًا عن دور.',
  },
  {
    num: '06',
    title: 'الباحث',
    line: 'طالب أو أستاذ يكتب بحثه: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ.',
  },
  {
    num: '07',
    title: 'مشرف المعمل',
    line: 'المعامل الافتراضية قيد التطوير — فهرس للاستعراض دون تشغيل بعد.',
  },
  {
    num: '08',
    title: 'وليّ الأمر',
    line: 'لا حساب منفصل لوليّ الأمر اليوم — المتابعة تمرّ عبر تقرير الطالب نفسه.',
  },
];

/** the row that starts open (and whose slide starts active) */
const FIRST_OPEN = 0;

/* T-13: the reference faq hover ordinals (spec hovers: 5/6/7 · 20/21/22 · 35). */
const ROLE_HOVER_ORD = [5, 6, 7, 20, 21, 22, 35];

export function Roles() {
  /* the accordion's open row (and the deck's active slide). Clicking a
   * row's icon opens it — the rows themselves stay non-controls (the
   * spec's own interactive census: the icon wrap is the hit target). */
  const [open, setOpen] = useState<number>(FIRST_OPEN);
  const active = ROLE_ROWS[open] as RoleRow;

  return (
    <section
      id="roles"
      className="rl-section"
      aria-labelledby="rl-title"
      data-spec="roles.wrap"
    >
      {/* the hairline frame: top + bottom rules (the section IS the
          frame — full-bleed, no radius, no padding) */}
      <div className="rl-rule rl-rule-top" aria-hidden="true" data-spec="roles.ruletop" />
      <div className="rl-rule rl-rule-bottom" aria-hidden="true" data-spec="roles.rulebottom" />

      <div className="rl-frame" data-spec="roles.frame">
        {/* ── the media pane: the 8-slide deck. One slide per row; the
            open row's slide is active (the spec's transform,opacity
            .4s ease cross-fade). The pane's inner edge carries the
            center hairline (a real 1px element — the spec's mid rule). */}
        <div className="rl-media" aria-hidden="true" data-spec="roles.media">
          <div className="rl-mediarule" data-spec="roles.mediarule" />
          {/* R345-ED → r347 — the deck's sheet furniture: the corner registration
              marks + the mono surface counter following the open row
              (click/keyboard-driven, never hover-dependent). The note
              re-seats honestly for the machines: the slides are diagrams
              now, never a claim of real UI. */}
          <div className="rl-deck-meta">
            <span className="lp-tag rl-deck-count fo-mono" data-tone="accent" dir="ltr">[{String(open + 1).padStart(2, '0')}/08]</span>
            <span className="rl-deck-note">مخطط لسطح الدور — رسم تخطيطي</span>
          </div>
          <span className="rl-deck-mark rl-deck-mark-a" aria-hidden="true" />
          <span className="rl-deck-mark rl-deck-mark-b" aria-hidden="true" />
          <div className="rl-deck" data-spec="roles.mediadeck">
            <div className="rl-deckinner" data-spec="roles.mediainner">
              {ROLE_ROWS.map((r, i) => {
                const Scene = ROLE_SLIDES[i]!;
                return (
                  <div
                    key={r.num}
                    className={`rl-slide${i === open ? ' is-active' : ''}`}
                    data-spec={`roles.slide.${i + 1}`}
                  >
                    <Scene dataSpec={`roles.slideimg.${i + 1}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── the title column: label + three-line display title. The
            stacked bands add the mid rule under it (390) / over it
            (768 — the media's bottom edge). */}
        <div className="rl-titlecol" data-spec="roles.titlecol">
          <div className="rl-labelbox" data-spec="roles.labelbox">
            <div className="rl-label" data-spec="roles.label">
              {/* T-14: kept hand-rolled — r306-landing-sheet.test.ts
                  pins this exact template (the numeral VOICE: mono,
                  Latin, dir=ltr, tabular); lp-numeral is its equal. */}
              <span className="fo-mono" dir="ltr">[{active.num}]</span> {active.title}
            </div>
          </div>
          <div className="rl-h2box" data-spec="roles.h2box">
            <h2 className="rl-h2" id="rl-title" data-spec="roles.h2">
              لكلِّ دورٍ مقعده
              <br data-spec="roles.h2br1" /> من الطالب إلى المالك
              <br data-spec="roles.h2br2" /> منصّة واحدة تجمعهم
            </h2>
          </div>
          <div className="rl-midrule" aria-hidden="true" data-spec="roles.midrule" />
        </div>

        {/* ── the content column: the ruled accordion. Rows butt (0
            gap), each carrying its own bottom hairline; the open row
            adds a top hairline and unfolds its one-line answer. */}
        <div className="rl-contentcol" data-spec="roles.contentcol">
          <div className="rl-accwrap" data-spec="roles.accwrap">
            <div className="rl-acc" data-spec="roles.acc">
              {ROLE_ROWS.map((r, i) => {
                const isOpen = i === open;
                return (
                  <div
                    key={r.num}
                    className={`rl-row${isOpen ? ' is-open' : ''}`}
                    data-spec={`roles.row.${i + 1}`}
                    style={{ ['--rl-i' as string]: i }}
                  >
                    <div className="rl-row-tw" data-spec={`roles.rowtw.${i + 1}`}>
                      <div className="rl-row-twf" data-spec={`roles.rowtwf.${i + 1}`}>
                        <div className="rl-row-ink" data-spec={`roles.rowink.${i + 1}`}>
                          <div className="rl-row-title" data-spec={`roles.rowtitle.${i + 1}`}>
                            {r.title}
                          </div>
                        </div>
                      </div>
                      <div
                        className="rl-row-icon"
                        role="button"
                        tabIndex={0}
                        aria-label={r.title}
                        data-spec-hover={String(ROLE_HOVER_ORD[i] ?? 305 + i * 15)}
                        data-spec={`roles.rowicon.${i + 1}`}
                        onClick={() => setOpen(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpen(i);
                          }
                        }}
                      >
                        <div className="rl-row-iconbtn" data-spec={`roles.rowiconbtn.${i + 1}`}>
                          <svg
                            className="rl-row-svg"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            data-spec={`roles.rowsvg.${i + 1}`}
                          >
                            {/* the spec's own glyph metrics: the strokes
                                span 11.64/16 of the box — 16px inside the
                                22px icon at 1920, 14.55px inside the 20px
                                icon at 390 (x-offset 3px both) */}
                            <path className="rl-p1" d="M2.18 8h11.64" data-spec={`roles.rowpath1.${i + 1}`} />
                            <path className="rl-p2" d="M8 2.18v11.64" data-spec={`roles.rowpath2.${i + 1}`} />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {isOpen ? (
                      <>
                        <div className="rl-row-linebox" data-spec={`roles.rowlinebox.${i + 1}`}>
                          <div className="rl-row-line" data-spec={`roles.rowline.${i + 1}`}>
                            {r.line}
                          </div>
                        </div>
                        <div className="rl-row-rule rl-row-rule-o" aria-hidden="true" data-spec={`roles.rowrule1.${i + 1}`} />
                        <div className="rl-row-rule rl-row-rule-b" aria-hidden="true" data-spec={`roles.rowrule2.${i + 1}`} />
                        <div className="rl-row-rule rl-row-rule-t" aria-hidden="true" data-spec={`roles.rowruletop.${i + 1}`} />
                      </>
                    ) : (
                      <>
                        <div className="rl-row-rule rl-row-rule-o" aria-hidden="true" data-spec={`roles.rowrule1.${i + 1}`} />
                        <div className="rl-row-rule rl-row-rule-b" aria-hidden="true" data-spec={`roles.rowrule2.${i + 1}`} />
                        <div className="rl-row-zero" aria-hidden="true" data-spec={`roles.rowzero.${i + 1}`} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
