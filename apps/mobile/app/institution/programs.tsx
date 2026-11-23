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
import { useProgramsPaged } from "@/features/institutional/queries";
import type { Program } from "@/api/institutional";
import { PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "ACTIVE", label: PROGRAM_STATUS_LABELS.ACTIVE },
  { id: "APPROVED", label: PROGRAM_STATUS_LABELS.APPROVED },
  { id: "DRAFT", label: PROGRAM_STATUS_LABELS.DRAFT },
  { id: "SUSPENDED", label: PROGRAM_STATUS_LABELS.SUSPENDED },
  { id: "CLOSED", label: PROGRAM_STATUS_LABELS.CLOSED },
];

/** The program row — memoized at module scope (FlashList purity). */
const ProgramRow = makeRow<Program>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.nameAr}
      onPress={() => router.push(`/institution/programs/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.nameAr}</T>
          <T variant="xs" color="muted">
            {labelOf(PROGRAM_KIND_LABELS, item.kind)}
            {item.code ? ` · ${item.code}` : ""}
            {item.orgUnit ? ` · ${item.orgUnit.nameAr}` : ""}
            {item.credentialType ? ` · ${item.credentialType.nameAr}` : ""}
          </T>
        </View>
        <Badge label={labelOf(PROGRAM_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/programs — the programs register (web ProgramsPage
 * parity, read surface): academic/technical/professional programs
 * with kind + status + the owning unit; tapping opens the program
 * record (versions + credential type). DataList + usePagedList —
 * every page reachable, the total is the server's word.
 */
export default function InstitutionPrograms() {
  const [status, setStatus] = useState("");
  const programs = useProgramsPaged({ status: status || undefined });
  const total = programs.meta?.total ?? programs.items.length;
  const activeCount = programs.items.filter((pr) => pr.status === "ACTIVE").length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="البرامج والخطط" kicker="سجل البرامج" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        <T variant="xs" color="faint">
          {latn(programs.items.length)} معروضاً{total > programs.items.length ? ` من ${latn(total)} وفق سجل البرامج` : ""}
          {` · ${latn(activeCount)} نشطة`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={programs.items}
          renderItem={({ item }) => <ProgramRow item={item} />}
          keyExtractor={(pr) => pr.id}
          isLoading={programs.isLoading}
          isError={programs.isError}
          emptyTitle="لا برامج بعد"
          emptyMessage="لم تُعتمد برامج لهذه المؤسسة بعد — البرامج الأكاديمية والتقنية والمهنية."
          onRetry={() => programs.refetch()}
          refetch={programs.refetch}
          isRefetching={programs.isRefetching}
          onEndReached={programs.onEndReached}
          isFetchingNextPage={programs.isFetchingNextPage}
          hasNextPage={programs.hasNextPage}
          loadMoreError={programs.loadMoreError}
          onRetryLoadMore={programs.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
