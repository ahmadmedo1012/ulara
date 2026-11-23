import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useCouncil, useMeetings } from "@/features/institutional/queries";
import {
  COUNCIL_TYPE_LABELS, COUNCIL_STATUS_LABELS, COUNCIL_ROLE_LABELS,
  MEMBERSHIP_STATUS_LABELS, MEETING_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/councils/[id] — the council record (web
 * CouncilDetailPage parity, read surface): the memberships (who
 * chairs, who takes minutes, the members) + the meetings register —
 * each meeting row opens the agenda/attendance/resolutions/minutes
 * record.
 */
export default function InstitutionCouncilDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const council = useCouncil(id || null);
  const meetings = useMeetings(id || null);

  const data = council.data ?? null;
  const meetingRows = meetings.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title={data?.nameAr ?? "سجل المجلس"} kicker="المجالس واللجان" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        {council.isLoading ? (
          <SkeletonList rows={6} />
        ) : council.isError ? (
          <ErrorState message="تعذّر تحميل سجل المجلس." onRetry={() => council.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد المجلس" message="هذا المجلس غير موجود في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.nameAr}</T>
                <Badge label={labelOf(COUNCIL_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              <T variant="sm" color="muted">
                {labelOf(COUNCIL_TYPE_LABELS, data.type)}
                {data.decisionRef ? ` · قرار التشكيل: ${data.decisionRef}` : ""}
              </T>
            </View>

            <T variant="h4" weight="bold">العضوية</T>
            {(data.memberships ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا عضوية مسجلة لهذا المجلس.</T>
            ) : (
              <RowList>
                {(data.memberships ?? []).map((m, i, arr) => (
                  <LedgerRow key={m.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{m.person?.displayName ?? "عضو غير مرتبط"}</T>
                        <T variant="xs" color="muted">
                          {labelOf(COUNCIL_ROLE_LABELS, m.role)}
                          {" · "}
                          {m.startDate.slice(0, 10)}
                        </T>
                      </View>
                      <Badge label={labelOf(MEMBERSHIP_STATUS_LABELS, m.status)} tone={toneOf(m.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            <T variant="h4" weight="bold">الاجتماعات</T>
            {meetings.isLoading ? (
              <SkeletonList rows={3} />
            ) : meetings.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل الاجتماعات.</T>
            ) : meetingRows.length === 0 ? (
              <T variant="sm" color="muted">لا اجتماعات مسجلة لهذا المجلس بعد.</T>
            ) : (
              <RowList>
                {meetingRows.map((m, i) => (
                  <LedgerRow
                    key={m.id}
                    last={i === meetingRows.length - 1}
                    accessibilityLabel={`اجتماع ${m.seqNumber ?? ""} ${m.scheduledAt}`}
                    onPress={() => router.push(`/institution/councils/${id}/meetings/${m.id}` as never)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">
                          {m.seqNumber ? `الاجتماع رقم ${m.seqNumber}` : "اجتماع"}
                          {" · "}
                          {m.scheduledAt.slice(0, 16).replace("T", " ")}
                        </T>
                        {m.agendaSummary ? (
                          <T variant="xs" color="muted" numberOfLines={2}>{m.agendaSummary}</T>
                        ) : null}
                      </View>
                      <Badge label={labelOf(MEETING_STATUS_LABELS, m.status)} tone={toneOf(m.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}
          </>
        )}
      </View>
    </View>
  );
}
