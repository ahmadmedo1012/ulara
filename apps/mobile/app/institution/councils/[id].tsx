import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useCouncil, useMeetingsPaged } from "@/features/institutional/queries";
import type { CouncilMeeting } from "@/api/institutional";
import {
  COUNCIL_TYPE_LABELS, COUNCIL_STATUS_LABELS, COUNCIL_ROLE_LABELS,
  MEMBERSHIP_STATUS_LABELS, MEETING_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/** The meeting row — memoized at module scope (FlashList purity). */
const MeetingRow = makeRow<CouncilMeeting>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={`اجتماع ${item.seqNumber ?? ""} ${item.scheduledAt}`}
      onPress={() => router.push(`/institution/councils/${item.councilId}/meetings/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">
            {item.seqNumber ? `الاجتماع رقم ${item.seqNumber}` : "اجتماع"}
            {" · "}
            {item.scheduledAt.slice(0, 16).replace("T", " ")}
          </T>
          {item.location ? (
            <T variant="xs" color="muted">{item.location}</T>
          ) : null}
          {item.agendaSummary ? (
            <T variant="xs" color="muted" numberOfLines={2}>{item.agendaSummary}</T>
          ) : null}
        </View>
        <Badge label={labelOf(MEETING_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/councils/[id] — the council record (web
 * CouncilDetailPage parity, read surface): the masthead + the ACTIVE
 * memberships (who chairs, who takes minutes, the members) ride the
 * fixed header; the MEETINGS register is the screen's own paged
 * DataList (every meeting reachable — one scroller, ListHeader carries
 * the sections per the no-nesting rule).
 */
export default function InstitutionCouncilDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const council = useCouncil(id || null);
  const meetings = useMeetingsPaged(id || null);

  const data = council.data ?? null;
  const total = meetings.meta?.total ?? meetings.items.length;

  if (council.isLoading) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المجلس" kicker="المجالس واللجان" />
        <View style={{ padding: sp[16] }}>
          <SkeletonList rows={6} />
        </View>
      </Screen>
    );
  }
  if (council.isError) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المجلس" kicker="المجالس واللجان" />
        <View style={{ padding: sp[16] }}>
          <ErrorState message="تعذّر تحميل سجل المجلس." onRetry={() => council.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المجلس" kicker="المجالس واللجان" />
        <View style={{ padding: sp[16] }}>
          <EmptyState title="لا يوجد المجلس" message="هذا المجلس غير موجود في هذه المؤسسة." />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title={data.nameAr} kicker="المجالس واللجان" />
      <View style={{ flex: 1 }}>
        {/* the fixed header: masthead + the ACTIVE memberships */}
        <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
          <View style={{ gap: sp[6] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
              <T variant="h3" weight="bold">{data.nameAr}</T>
              <Badge label={labelOf(COUNCIL_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
            </View>
            <T variant="sm" color="muted">
              {labelOf(COUNCIL_TYPE_LABELS, data.type)}
              {data.charterRef ? ` · لائحة التشكيل: ${data.charterRef}` : ""}
              {data.legalBasis ? ` · ${data.legalBasis}` : ""}
              {data.establishedAt ? ` · تشكيل ${data.establishedAt.slice(0, 10)}` : ""}
            </T>
            {data.orgUnit ? (
              <T variant="xs" color="faint">الوحدة: {data.orgUnit.nameAr}</T>
            ) : null}
          </View>

          <T variant="h4" weight="bold">العضوية السارية</T>
          {data.memberships.length === 0 ? (
            <T variant="sm" color="muted">لا عضوية سارية مسجلة لهذا المجلس.</T>
          ) : (
            <View style={{ gap: sp[6] }}>
              {data.memberships.map((m) => (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{m.person?.fullNameAr ?? "عضو غير مرتبط"}</T>
                    <T variant="xs" color="muted">
                      {labelOf(COUNCIL_ROLE_LABELS, m.role)}
                      {" · "}
                      {m.startDate.slice(0, 10)}
                    </T>
                  </View>
                  <Badge label={labelOf(MEMBERSHIP_STATUS_LABELS, m.status)} tone={toneOf(m.status)} />
                </View>
              ))}
            </View>
          )}

          <T variant="h4" weight="bold">الاجتماعات</T>
          <T variant="xs" color="faint">
            {latn(meetings.items.length)} معروضاً{total > meetings.items.length ? ` من ${latn(total)} وفق سجل المجلس` : ""}
          </T>
        </View>

        {/* the meetings register — the screen's own scroller */}
        <View style={{ flex: 1, paddingTop: sp[8] }}>
          <DataList
            data={meetings.items}
            renderItem={({ item }) => <MeetingRow item={item} />}
            keyExtractor={(m) => m.id}
            isLoading={meetings.isLoading}
            isError={meetings.isError}
            emptyTitle="لا اجتماعات بعد"
            emptyMessage="لا اجتماعات مسجلة لهذا المجلس بعد."
            onRetry={() => meetings.refetch()}
            refetch={meetings.refetch}
            isRefetching={meetings.isRefetching}
            onEndReached={meetings.onEndReached}
            isFetchingNextPage={meetings.isFetchingNextPage}
            hasNextPage={meetings.hasNextPage}
            loadMoreError={meetings.loadMoreError}
            onRetryLoadMore={meetings.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        </View>
      </View>
    </Screen>
  );
}
