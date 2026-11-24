/**
 * Student-facing live sessions list.
 *
 * Path: /student/live
 * Restricted: STUDENT (route-level).
 *
 * Watch-only by design — students cannot create, schedule, or end
 * sessions. They see only sessions for offerings they are enrolled
 * in, and can join the teacher-provided URL.
 *
 * R304 rebuild: PageFrame + patterns PageHeader + per-status sections
 * as RowList/RowItem rows. The session row is deliberately NOT a
 * whole-row link — its trailing slot carries the real join/recording
 * anchors, and a row that is itself a link must never nest an
 * interactive control (patterns contract).
 *
 * R359 (A3) — the page speaks the sheet grammar: the KPI band of real
 * session counts replaces the StatLine, and the per-status boards live
 * inside framed SheetSections (explicit index + Latin caption + Arabic
 * title, the honest count on the head rule). The .live-chip/.live-dot
 * honest LIVE pulse and the .live-row-icon wells keep their
 * student.css family untouched.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ExternalLink, Clock, MonitorPlay, X, Video, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  PageFrame, PageHeader, RowList, RowItem,
} from '../../components/patterns';
/* R359 (A3) — the sheet grammar: the KPI band of real session counts
 * + the framed per-status sections (the roster exemplar's
 * recomposition). The session rows keep their RowItem anatomy inside
 * the frames. */
import { SheetSection, KpiBand, SheetEmpty } from '../../components/patterns';
import { useJoinLiveSession, useLiveSessions, type LiveSessionRow } from '../../hooks/useResources';
import { apiErrorMessage } from '../../hooks/useResources';

import { formatDate } from '../../utils/numbers';
import { countAr } from '../../lib/format';

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

export default function LivePage() {
  const { data: sessions, isPending, isError, error, refetch } = useLiveSessions();
  const join = useJoinLiveSession();
  /* r323 B2.4 — the in-page seat: «انضمام» records attendance and mounts
     the Jitsi room INSIDE the page (the brief: «join button opens within
     the page»); the external-tab anchor stays as the fallback for
     browsers that refuse third-party iframes. */
  const [joined, setJoined] = useState<LiveSessionRow | null>(null);

  const onJoin = (s: LiveSessionRow) => {
    join.mutate(s.id, {
      onSuccess: ({ session }) => {
        setJoined({ ...s, ...session });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  };

  // `sessions` is undefined while pending AND on error — derive from a
  // settled list only, so an API failure can never render as "no sessions".
  const list = useMemo(
    () => (!isPending && !isError ? (sessions ?? []) : []),
    [isPending, isError, sessions],
  );

  const live = useMemo(() => list.filter((s) => s.status === 'LIVE'), [list]);
  const upcoming = useMemo(() => list.filter((s) => s.status === 'SCHEDULED'), [list]);
  const ended = useMemo(() => list.filter((s) => s.status === 'ENDED'), [list]);
  // The section shows the latest window only; the KPI band keeps the
  // honest ENDED total.
  const recent = useMemo(() => ended.slice(0, 8), [ended]);

  /* The header's one live-status answer — quiet while the query is
     pending, the honest pulse chip / quiet chip once settled (the
     neutral answer rides the square r305s-chip register; the old
     Badge pill retired with the sheet conversion). */
  const headerStatus = !isPending
    ? live.length > 0
      ? (
          <span className="live-chip">
            <span className="live-dot" aria-hidden />
            على الهواء الآن
          </span>
        )
      : !isError
        ? (
            <span className="r305s-chip">
              <span className="r305s-chip-dot" aria-hidden />
              لا بثّ مباشر الآن
            </span>
          )
        : undefined
    : undefined;

  return (
    <div className="r321m-page">
    <PageFrame width="default">
      <PageHeader
        eyebrow="المعامل والتقنيات"
        title="البث المباشر"
        description="الجلسات الحيّة لمقرّراتك المسجَّلة — انضمّ للبثّ المباشر، وستجد التسجيلات هنا بعد انتهاء كل جلسة."
        /* R342-08 — the header CTA pair joins the live-status chip
           (the D11/D8 measured seat; the phone band hides the topbar
           «اسأل AI» ≤920, D6): «الندوات وورش العمل» carries the
           scheduled sessions, «المعامل الافتراضية» completes the
           immersive trio — navigation-only, the join action stays
           on its session row. */
        actions={(
          <>
            {headerStatus}
            <Link to="/student/webinars" className="btn primary sm">
              <Icon icon={Video} size={13} />
              الندوات وورش العمل
            </Link>
            <Link to="/student/labs" className="btn ghost sm">
              <Icon icon={FlaskConical} size={13} />
              المعامل الافتراضية
            </Link>
          </>
        )}
      />

      {joined && (
        <section className="live-embed" aria-label={`جلسة مباشرة — ${joined.title}`}>
          <div className="live-embed-head">
            <span className="live-chip">
              <span className="live-dot" aria-hidden />
              على الهواء
            </span>
            <strong className="live-embed-title">{joined.title}</strong>
            <span className="r305s-meta-row">
              <bdi>{joined.offering.course.code}</bdi>
              <span className="r305s-meta-sep" aria-hidden />
              سُجّل حضورك تلقائيًا
            </span>
            <div className="live-embed-actions">
              <a href={joined.joinUrl ?? '#'} target="_blank" rel="noreferrer" className="btn sm ghost">
                <Icon icon={ExternalLink} size={12} /> نافذة مستقلة
              </a>
              <button
                type="button"
                className="btn sm"
                onClick={() => setJoined(null)}
              >
                <Icon icon={X} size={12} /> إنهاء العرض
              </button>
            </div>
          </div>
          <div className="live-embed-frame">
            <iframe
              src={joined.joinUrl ?? undefined}
              title={`غرفة البث المباشر — ${joined.title}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              loading="lazy"
            />
          </div>
          <p className="live-embed-note">
            إذا ظهرت الغرفة فارغة أو رفض المتصفح التضمين، افتحها في{' '}
            <a href={joined.joinUrl ?? '#'} target="_blank" rel="noreferrer">نافذة مستقلة</a>.
          </p>
        </section>
      )}

      {join.isError && (
        <div className="r323d-live-error" role="alert">
          {apiErrorMessage(join.error, 'تعذّر الانضمام — أعد المحاولة.')}
        </div>
      )}

      {isPending ? (
        <RowList loading aria-label="جلسات البث" />
      ) : isError ? (
        /* API-down is the default demo state — surface it honestly with
           retry inside the framed session log. */
        <SheetSection index="01" caption="SESSION LOG" title="جلسات البثّ">
          <ErrorState
            message="تعذَّر تحميل البثوث"
            error={error}
            onRetry={() => refetch()}
          />
        </SheetSection>
      ) : (
        <>
          {/* R359 — the KPI band: the three real session counts (the
              old MetricCard wall's facts, the StatLine's numerals —
              same sources, the dimension-string register now). */}
          <KpiBand
            items={[
              {
                index: '01',
                caption: 'LIVE',
                label: 'مباشرة الآن',
                value: live.length,
                delta: live.length > 0 ? 'على الهواء الآن' : undefined,
                deltaTone: live.length > 0 ? 'signal' : undefined,
              },
              {
                index: '02',
                caption: 'SCHEDULED',
                label: 'جلسات قادمة',
                value: upcoming.length,
              },
              {
                index: '03',
                caption: 'ENDED',
                label: 'جلسات منتهية',
                value: ended.length,
              },
            ]}
          />

          {/* 22-c (A4 P2-1): an empty schedule used to stack THREE
              «nothing» cards on top of the 0/0/0 KPIs. A fully-empty
              list gets ONE honest empty state; the per-status sections
              keep their stable slots (15-j §3 #10: "is anything on
              air?" deserves a stable answer) only when the schedule
              has ANY content. R359: the one empty state is the
              hairline placeholder frame. */}
          {list.length === 0 ? (
            <SheetSection index="01" caption="SESSION LOG" title="جلسات البثّ">
              <SheetEmpty
                code="NO-SESSIONS"
                title="لا توجد بثوث بعد"
                desc="لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً."
              />
            </SheetSection>
          ) : (
            <>
              <SheetSection
                index="01"
                caption="ON AIR"
                title="مباشرة الآن"
                aside={live.length > 0 ? (
                  <span className="sg-label">{countAr(live.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}</span>
                ) : undefined}
              >
                {live.length > 0 && (
                  <p className="ml-sec-note">انضمّ إلى أيّ جلسة بنقرة واحدة</p>
                )}
                <RowList
                  aria-label="الجلسات المباشرة الآن"
                  empty={(
                    <SheetEmpty
                      code="OFF-AIR"
                      title="لا بثّ مباشرة الآن"
                      desc="لا توجد جلسات نشطة لمقرراتك في هذه اللحظة؛ راجع الجلسات القادمة في القائمة أدناه."
                    />
                  )}
                >
                  {live.map((s) => (
                    <StudentSessionRow
                      key={s.id}
                      session={s}
                      canJoin
                      onJoin={onJoin}
                      joinPending={join.isPending}
                    />
                  ))}
                </RowList>
              </SheetSection>

              <SheetSection
                index="02"
                caption="SCHEDULED"
                title="جلسات قادمة"
                aside={upcoming.length > 0 ? (
                  <span className="sg-label">{countAr(upcoming.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}</span>
                ) : undefined}
                pad="none"
              >
                <RowList
                  aria-label="الجلسات القادمة"
                  empty={(
                    <SheetEmpty
                      code="NONE"
                      title="لا توجد جلسات مجدولة"
                      desc="لا توجد جلسات مجدولة لمقرراتك حالياً. سيظهر هنا أي بثّ يجدوله أساتذتك."
                    />
                  )}
                >
                  {upcoming.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                </RowList>
              </SheetSection>

              {recent.length > 0 && (
                <SheetSection
                  index="03"
                  caption="RECENT"
                  title="جلسات منتهية"
                  aside={(
                    /* The board prints the rows it shows (the latest
                        window); the KPI band above keeps the honest
                        ENDED total. */
                    <span className="sg-label">{countAr(recent.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}</span>
                  )}
                >
                  <p className="ml-sec-note">أحدث الجلسات المنتهية — قد تتوفر لها تسجيلات</p>
                  <RowList aria-label="الجلسات المنتهية">
                    {recent.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                  </RowList>
                </SheetSection>
              )}
            </>
          )}
        </>
      )}
    </PageFrame>
    </div>
  );
}

/**
 * One session row (RowItem anatomy — no whole-row link). The join/
 * recording anchors ride the trailing slot as real <a> targets; the
 * status chip keeps the stable status answer. The course emoji is
 * DATA from the course record (icon policy: EmojiIcon is the
 * data-layer emoji → Lucide bridge only). R321 B2: the status rides
 * the square r305s-chip register — tone on the dot, the honest
 * Arabic words the chip body (the amber/green/red Badge pills
 * retired); the LIVE pulse keeps its .live-chip family.
 */
function StudentSessionRow({
  session: s,
  canJoin,
  onJoin,
  joinPending,
}: {
  session: LiveSessionRow;
  canJoin?: boolean;
  onJoin?: (s: LiveSessionRow) => void;
  joinPending?: boolean;
}) {
  const ended = s.status === 'ENDED' || s.status === 'CANCELLED';
  return (
    <RowItem
      leading={
        <span
          className="live-row-icon"
          style={{ '--row-accent': s.offering.course.themeColor ?? 'var(--accent)' } as CSSProperties}
        >
          <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={20} />
        </span>
      }
      title={s.title}
      meta={
        /* R305 DS: the row's metadata rides the meta-row register —
            hairline separators instead of bare middots. */
        <span className="r305s-meta-row">
          <bdi>{s.offering.course.code}</bdi>
          <span className="r305s-meta-sep" aria-hidden />
          {s.offering.course.name}
          {s.topic && (
            <>
              <span className="r305s-meta-sep" aria-hidden />
              {s.topic}
            </>
          )}
          <span className="r305s-meta-sep" aria-hidden />
          <Icon icon={Clock} size={11} />{' '}
          <bdi>
            {formatDate(s.scheduledAt, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </bdi>
          <span className="r305s-meta-sep" aria-hidden />
          {/* 22-c (A4 P3-5): a transliterated/Latin teacher name would
              scramble the Arabic sentence — isolated like the course
              code above. */}
          الأستاذ: د. <bdi>{s.teacher.firstName} {s.teacher.lastName}</bdi>
        </span>
      }
      trailing={
        <>
          {s.status === 'LIVE' && (
            <span className="live-chip">
              <span className="live-dot" aria-hidden />
              مباشر
            </span>
          )}
          {s.status === 'SCHEDULED' && (
            <span className="r305s-chip r305s-chip--warning">
              <span className="r305s-chip-dot" aria-hidden />
              مجدولة
            </span>
          )}
          {ended && (
            <span className={`r305s-chip ${s.status === 'CANCELLED' ? 'r305s-chip--danger' : 'r305s-chip--success'}`}>
              <span className="r305s-chip-dot" aria-hidden />
              {s.status === 'CANCELLED' ? 'ملغاة' : 'منتهية'}
            </span>
          )}
          {/* r323 B2.4: the join goes THROUGH the attendance hook and
              mounts the in-page embed — the external anchor is the
              explicit fallback («نافذة مستقلة» inside the embed head). */}
          {canJoin && s.joinUrl && (
            <button
              type="button"
              className="btn primary sm"
              disabled={joinPending}
              onClick={() => onJoin?.(s)}
            >
              <Icon icon={MonitorPlay} size={12} /> انضمام
            </button>
          )}
          {ended && s.recordingUrl && (
            <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="btn sm">
              <Icon icon={ExternalLink} size={12} /> التسجيل
            </a>
          )}
        </>
      }
    />
  );
}
