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
import { useFacilitiesPaged } from "@/features/institutional/queries";
import type { Facility } from "@/api/institutional";
import { FACILITY_TYPE_LABELS, FACILITY_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const TYPE_CHIPS = [
  { id: "", label: "الكل" },
  { id: "LABORATORY", label: FACILITY_TYPE_LABELS.LABORATORY },
  { id: "WORKSHOP", label: FACILITY_TYPE_LABELS.WORKSHOP },
  { id: "CLASSROOM", label: FACILITY_TYPE_LABELS.CLASSROOM },
  { id: "PRACTICAL_TRAINING_FACILITY", label: FACILITY_TYPE_LABELS.PRACTICAL_TRAINING_FACILITY },
  { id: "LECTURE_HALL", label: FACILITY_TYPE_LABELS.LECTURE_HALL },
];

/** The facility row — memoized at module scope (FlashList purity). */
const FacilityRow = makeRow<Facility>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.nameAr}
      onPress={() => router.push(`/institution/facilities/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.nameAr}</T>
          <T variant="xs" color="muted">
            {labelOf(FACILITY_TYPE_LABELS, item.type)}
            {item.capacity != null ? ` · سعة ${item.capacity}` : ""}
            {item.building ? ` · مبنى ${item.building}` : ""}
            {typeof item.equipmentCount === "number" ? ` · ${item.equipmentCount} معدة` : ""}
          </T>
        </View>
        <Badge label={labelOf(FACILITY_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/facilities — the facilities register (web
 * FacilitiesPage parity, read surface): labs, workshops, halls with
 * capacity/location; tapping opens the facility's own record
 * (equipment + reservations + work orders). DataList + usePagedList
 * — every page reachable, the total is the server's word.
 */
export default function InstitutionFacilities() {
  const [type, setType] = useState("");
  const facilities = useFacilitiesPaged({ type: type || undefined });
  const total = facilities.meta?.total ?? facilities.items.length;
  const activeCount = facilities.items.filter((f) => f.status === "ACTIVE").length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="المعامل والموارد" kicker="سجل المنشآت" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={TYPE_CHIPS} selectedId={type} onSelect={setType} />
        <T variant="xs" color="faint">
          {latn(facilities.items.length)} معروضاً{total > facilities.items.length ? ` من ${latn(total)} وفق سجل المنشآت` : ""}
          {` · ${latn(activeCount)} متاحة`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={facilities.items}
          renderItem={({ item }) => <FacilityRow item={item} />}
          keyExtractor={(f) => f.id}
          isLoading={facilities.isLoading}
          isError={facilities.isError}
          emptyTitle="لا منشآت بعد"
          emptyMessage="لم تُسجَّل منشآت بعد — المعامل والورش وقاعات الدرس."
          onRetry={() => facilities.refetch()}
          refetch={facilities.refetch}
          isRefetching={facilities.isRefetching}
          onEndReached={facilities.onEndReached}
          isFetchingNextPage={facilities.isFetchingNextPage}
          hasNextPage={facilities.hasNextPage}
          loadMoreError={facilities.loadMoreError}
          onRetryLoadMore={facilities.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
