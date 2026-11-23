import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { ChipGroup } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useCouncilsPaged } from "@/features/institutional/queries";
import type { Council } from "@/api/institutional";
import { COUNCIL_TYPE_LABELS, COUNCIL_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "ACTIVE", label: COUNCIL_STATUS_LABELS.ACTIVE },
  { id: "DISSOLVED", label: COUNCIL_STATUS_LABELS.DISSOLVED },
  { id: "CANCELLED", label: COUNCIL_STATUS_LABELS.CANCELLED },
];

/** The council row — memoized at module scope (FlashList purity). */
const CouncilRow = makeRow<Council>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.nameAr}
      onPress={() => router.push(`/institution/councils/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.nameAr}</T>
          <T variant="xs" color="muted">
            {labelOf(COUNCIL_TYPE_LABELS, item.type)}
            {typeof item.membershipCount === "number" ? ` · ${item.membershipCount} عضواً` : ""}
            {typeof item.meetingCount === "number" ? ` · ${item.meetingCount} اجتماعاً` : ""}
            {item.establishedAt ? ` · ${item.establishedAt.slice(0, 4)}` : ""}
          </T>
        </View>
        <Badge label={labelOf(COUNCIL_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/councils — the councils register (web CouncilsPage
 * parity, read surface): councils and standing committees with their
 * type/status; tapping opens the council's own record (members +
 * meetings + documents). DataList + usePagedList: every page
 * reachable, the total is the server's word.
 */
export default function InstitutionCouncils() {
  const [status, setStatus] = useState("");
  const councils = useCouncilsPaged({ status: status || undefined });
  const total = councils.meta?.total ?? councils.items.length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="المجالس واللجان" kicker="سجل الحوكمة" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        <T variant="xs" color="faint">
          {latn(councils.items.length)} معروضاً{total > councils.items.length ? ` من ${latn(total)} وفق سجل الحوكمة` : ""}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={councils.items}
          renderItem={({ item }) => <CouncilRow item={item} />}
          keyExtractor={(c) => c.id}
          isLoading={councils.isLoading}
          isError={councils.isError}
          emptyTitle="لا مجالس بعد"
          emptyMessage="لم تُشكَّل مجالس أو لجان لهذه المؤسسة بعد — مجلس الجامعة، مجالس الكليات، اللجان الدائمة."
          onRetry={() => councils.refetch()}
          refetch={councils.refetch}
          isRefetching={councils.isRefetching}
          onEndReached={councils.onEndReached}
          isFetchingNextPage={councils.isFetchingNextPage}
          hasNextPage={councils.hasNextPage}
          loadMoreError={councils.loadMoreError}
          onRetryLoadMore={councils.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
