import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { useMeeting } from "@/features/institutional/queries";
import {
  MEETING_STATUS_LABELS, AGENDA_STATUS_LABELS, ATTENDANCE_LABELS,
  RESOLUTION_KIND_LABELS, RESOLUTION_STATUS_LABELS, MINUTES_STATUS_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/councils/[id]/meetings/[meetingId] — the meeting
 * record (web MeetingDetailPage parity, read surface): attendance,
 * agenda items, resolutions (with due dates) and the minutes draft
 * state — the governance depth in ONE scrolling page (every section
 * reachable). Wire shape (GET /governance/meetings/:id): the FLAT
 * prisma row with its one-to-many includes — `minutes` arrives as an
 * ARRAY of ≤1 current row (Prisma include semantics), read as
 * minutes[0] here.
 */
export default function InstitutionMeetingDetail() {
  const params = useLocalSearchParams<{ id: string; meetingId: string }>();
  const meetingId = typeof params.meetingId === "string" ? params.meetingId : Array.isArray(params.meetingId) ? params.meetingId[0] : "";

  const meeting = useMeeting(meetingId || null);
  const data = meeting.data ?? null;
  const minutes = data?.minutes && data.minutes.length > 0 ? data.minutes[0] : null;

  return (
    <Screen scroll padded={false}>
      <StackHeader
        title={data?.seqNumber ? `اجتماع رقم ${data.seqNumber}` : "سجل الاجتماع"}
        kicker="المجالس واللجان"
      />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {meeting.isLoading ? (
          <SkeletonList rows={6} />
        ) : meeting.isError ? (
          <ErrorState message="تعذّر تحميل سجل الاجتماع." onRetry={() => meeting.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد الاجتماع" message="هذا الاجتماع غير موجود." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.scheduledAt.slice(0, 16).replace("T", " ")}</T>
                <Badge label={labelOf(MEETING_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              {data.location ? (
                <T variant="sm" color="muted">المكان: {data.location}</T>
              ) : null}
            </View>

            {/* ── attendance ── */}
            <T variant="h4" weight="bold">الحضور</T>
            {(data.attendance ?? []).length === 0 ? (
              <T variant="sm" color="muted">لم يُسجَّل الحضور لهذا الاجتماع.</T>
            ) : (
              <RowList>
                {(data.attendance ?? []).map((a, i, arr) => (
                  <LedgerRow key={a.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{a.person?.fullNameAr ?? "غير مرتبط"}</T>
                        {a.attendeeKind === "GUEST" ? (
                          <T variant="xs" color="faint">ضيف موثَّق</T>
                        ) : null}
                      </View>
                      <Badge label={labelOf(ATTENDANCE_LABELS, a.status)} tone={toneOf(a.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── agenda ── */}
            <T variant="h4" weight="bold">جدول الأعمال</T>
            {(data.agendaItems ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا بنود في جدول الأعمال.</T>
            ) : (
              <RowList>
                {(data.agendaItems ?? []).map((item, i, arr) => (
                  <LedgerRow key={item.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <T variant="xs" color="faint">{item.orderNo}</T>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium">{item.titleAr}</T>
                      </View>
                      <Badge label={labelOf(AGENDA_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── resolutions ── */}
            <T variant="h4" weight="bold">القرارات والتوصيات</T>
            {(data.resolutions ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا قرارات مسجلة لهذا الاجتماع.</T>
            ) : (
              <RowList>
                {(data.resolutions ?? []).map((r, i, arr) => (
                  <LedgerRow key={r.id} last={i === arr.length - 1}>
                    <View style={{ gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                        <T variant="body" weight="medium">
                          {labelOf(RESOLUTION_KIND_LABELS, r.kind)}
                          {r.number ? ` ${r.number}` : ""}
                        </T>
                        <Badge label={labelOf(RESOLUTION_STATUS_LABELS, r.status)} tone={toneOf(r.status)} />
                      </View>
                      <T variant="xs" color="muted" numberOfLines={4}>{r.textAr}</T>
                      {r.dueDate ? (
                        <T variant="xs" color="faint">موعد التنفيذ: {r.dueDate.slice(0, 10)}</T>
                      ) : null}
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── minutes (the wire's ≤1-row array → [0]) ── */}
            <T variant="h4" weight="bold">المحضر</T>
            {minutes ? (
              <View style={{ gap: sp[6] }}>
                <StatLine label="حالة المحضر" value={labelOf(MINUTES_STATUS_LABELS, minutes.status)} />
                {minutes.approvedAt ? (
                  <T variant="xs" color="faint">اعتُمد: {minutes.approvedAt.slice(0, 10)}</T>
                ) : null}
                {minutes.signedAt ? (
                  <T variant="xs" color="faint">وُقِّع: {minutes.signedAt.slice(0, 10)}</T>
                ) : null}
                {minutes.contentAr ? (
                  <T variant="sm" color="muted" numberOfLines={12}>{minutes.contentAr}</T>
                ) : (
                  <T variant="sm" color="muted">مسودة المحضر بلا نص بعد.</T>
                )}
              </View>
            ) : (
              <T variant="sm" color="muted">لا محضر مسجل لهذا الاجتماع بعد.</T>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
