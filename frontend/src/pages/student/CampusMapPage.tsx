import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Building2, Download } from 'lucide-react';
/* R359 (A3) — the sheet grammar: the framed sections + the KPI band of
 * real directory counts replace the §B2 SectionBar register (the
 * roster exemplar's recomposition). The RowList directory rows keep
 * their anatomy inside the frame. */
import { SheetSection, KpiBand } from '../../components/patterns';
import { PageFrame, PageHeader, RowList, RowItem } from '../../components/patterns';
import { BarCount, EmptyCell } from '../../components/student';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useFaculties, useCurrentInstitutionSlug } from '../../hooks/useResources';

/* R305 DS: the shared student vocabulary + this family's refinements. */
import '../../styles/student/ds-core.css';
import '../../styles/student/ds-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 anatomy every converted
 * student page mounts (SectionBar/BarCount/EmptyCell + the family's
 * unlayered masthead tail precedent). */
import '../../styles/student/pages.css';
/* R321 (c1 · WP-B2): the map/live family's own harmonics — the
 * .r321m-page opt-in root + the inner-scale masthead re-seat (the
 * r321-exams.css contract); family-unique rules only. */
import '../../styles/student/map-live.css';

/**
 * Honest institution directory (Phase Ω — identity purity).
 *
 * The platform has NO campus: there is no map to draw and no city
 * footprint to chart — every institution's structure is built from its
 * OWN data after onboarding. What this page renders:
 *   · the honest statement (the map is built from YOUR institution's
 *     data — the registrar authors the structure, this directory reads
 *     it live from the institution's records);
 *   · the DB-driven faculty directory (real /faculties payload, every
 *     row a door to the faculty's page);
 *   · the obviously-synthetic demo contact details (clearly labeled).
 */

/** Arabic counted-noun forms for the counts on this page:
 *  1 → singular, 2 → dual, 3–10 → plural, 11+ → singular accusative. */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export default function CampusMapPage() {
  const facs = useFaculties(useCurrentInstitutionSlug()); // r180: caller-institution scoping
  const faculties = facs.data ?? [];
  /* R359 — the band's honest numerals: the faculties the registrar
   * authored + the departments under them (a real sum over the same
   * payload the directory renders). Honest-empty while pending. */
  const departmentCount = faculties.reduce((n, f) => n + f.departments.length, 0);

  return (
    /* R321 (c1 · WP-B2) — the page joins the sheet system: ONE
     * .r321m-page opt-in root (the r321-exams.css contract — the
     * inner-page masthead re-seat keys off it). The shell owns the
     * frame + grain + the SHEET line; the patterns PageHeader owns
     * the one display h1 at the inner rung. */
    <div className="r321m-page">
    <PageFrame width="default">
      <PageHeader
        eyebrow="خدمات المؤسّسة"
        title="دليل كليات مؤسستك"
        description={
          'لا خريطة جاهزة على أُلارا — الدليل يُقرأ مباشرة من بيانات مؤسستك: الهيكل الأكاديمي (كليات، أقسام، مقرّرات) ينشئه المسجّل العام، وهذه الصفحة تعرضه كما هو في قاعدة بياناتك.'
        }
        /* R342-08 — the header CTA pair (the D11/D8 measured seat;
           the phone band hides the topbar «اسأل AI» ≤920, D6):
           «بطاقة المؤسّسة» is the workspace's fact sheet, «مركز
           التحميلات» is the institution-services sibling. */
        actions={(
          <>
            <Link to="/student/university" className="btn primary sm">
              <Icon icon={Building2} size={13} />
              بطاقة المؤسّسة
            </Link>
            <Link to="/student/downloads" className="btn ghost sm">
              <Icon icon={Download} size={13} />
              مركز التحميلات
            </Link>
          </>
        )}
      />

      {/* R359 — the KPI band: the directory's two real counts (the
          faculties + their departments), honest-empty while the
          payload loads. */}
      <KpiBand
        items={[
          {
            index: '01',
            caption: 'FACULTIES',
            label: 'كلّيّات في دليل مؤسستك',
            value: faculties.length,
            empty: facs.isPending,
          },
          {
            index: '02',
            caption: 'DEPARTMENTS',
            label: 'أقسام أكاديمية تحتها',
            value: departmentCount,
            empty: facs.isPending,
          },
        ]}
      />

      {/* [01] the honest statement — the map is built from YOUR data. */}
      <SheetSection index="01" caption="INSTITUTION DATA" title="الخريطة تُبنى من بيانات مؤسستك">
        <p className="ml-sec-note">
          أُلارا منصّة مستقلة متعددة المستأجرين ولا تحمل حرمًا جامعيًّا ولا خريطة جاهزة:
          كليات مؤسستك تُنشأ من لوحة إدارة المؤسسة، وهذا الدليل يقرأها من قاعدة بيانات مؤسستك مباشرة —
          بلا قوالب مفروضة وبلا محتوى مُختلق.
        </p>
      </SheetSection>

      {/* [02] Directory — DB-driven, every row a door. R304: the RowList
          of whole-row links (`to` — the 44px row IS the tap target);
          R359: the framed sheet carries the honest count on the head
          rule's aside slot. */}
      {facs.isError ? null : (
        <SheetSection
          index="02"
          caption="FACULTY DIRECTORY"
          title="كليات مؤسستك"
          aside={facs.isSuccess ? (
            <BarCount
              n={faculties.length}
              srLabel={arCount(faculties.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')}
            />
          ) : undefined}
          pad="none"
        >
          <RowList
            loading={facs.isPending}
            aria-label="دليل الكليّات"
            empty={
              /* R321 B2 — the honest empty bucket is the sheet's
                 reserved-but-empty region: the hatched EmptyCell. */
              <EmptyCell
                label="لا توجد كليّات بعد"
                note="تنشئ إدارة المؤسسة كليات مؤسستك من «الهيكل الأكاديمي» في لوحة إدارة المؤسسة."
              />
            }
          >
            {faculties.map((f) => (
              <RowItem
                key={f.id}
                to={`/colleges/${f.id}`}
                leading={
                  <span style={{ color: 'var(--accent)' }} aria-hidden>
                    <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={20} />
                  </span>
                }
                title={f.name}
                meta={
                  <span className="r305s-meta-row">
                    {arCount(f.departments.length, 'قسم واحد', 'قسمان', 'أقسام', 'قسماً')}
                  </span>
                }
              />
            ))}
          </RowList>
        </SheetSection>
      )}

      {/* [03] Contact — hairline rows on the page paper (label rung +
          mono LTR values); the obviously-synthetic demo details, clearly
          labeled (the r307 demo-contact contract). */}
      <SheetSection index="03" caption="CONTACT" title="معلومات التواصل">
        <div className="ml-facts">
          <div className="ml-fact">
            <span className="ml-fact-label">الهاتف</span>
            <span className="ml-fact-values">
              <bdi dir="ltr" className="font-mono text-sm">+218 00 000000</bdi>
            </span>
          </div>
          <div className="ml-fact">
            <span className="ml-fact-label">البريد الإلكتروني</span>
            <span className="ml-fact-values">
              <bdi dir="ltr" className="font-mono text-sm">info@demo.ulara.ly</bdi>
            </span>
          </div>
        </div>

        <div className="campus-map-note">
          <Icon icon={Info} size={14} style={{ flexShrink: 0, marginBlockStart: 'var(--sp-0-5)' }} />
          <span>
            بيانات التواصل أعلاه بيانات عرض تجريبية بادية الصناعة — كل مؤسسة تحمل بياناتها الحقيقية
            بعد انضمامها.
          </span>
        </div>
      </SheetSection>

      {/* R305 DS: a card holding one link is box noise — the
          cross-link rides the copper rail instead. */}
      <div className="r305s-next r305p-rail">
        <Link to="/student/university" className="btn primary sm">
          <Icon icon={ArrowLeft} size={13} />
          بطاقة المؤسّسة الكاملة
        </Link>
      </div>
    </PageFrame>
    </div>
  );
}
