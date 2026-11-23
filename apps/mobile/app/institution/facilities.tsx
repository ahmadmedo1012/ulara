import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { ChipGroup } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useFacilities } from "@/features/institutional/queries";
import { FACILITY_TYPE_LABELS, FACILITY_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const TYPE_CHIPS = [
  { id: "", label: "الكل" },
  { id: "LABORATORY", label: FACILITY_TYPE_LABELS.LABORATORY },
  { id: "WORKSHOP", label: FACILITY_TYPE_LABELS.WORKSHOP },
  { id: "CLASSROOM", label: FACILITY_TYPE_LABELS.CLASSROOM },
  { id: "LECTURE_HALL", label: FACILITY_TYPE_LABELS.LECTURE_HALL },
];

/**
 * /institution/facilities — the facilities register (web
 * FacilitiesPage parity, read surface): labs, workshops, halls with
 * capacity/location; tapping opens the facility's own record
 * (equipment + reservations + work orders).
 */
export default function InstitutionFacilities() {
  const p = usePalette();
  const [type, setType] = useState("");
  const facilities = useFacilities({ type: type || undefined, limit: 50 });

  const rows = Array.isArray(facilities.data) ? facilities.data : facilities.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="المعامل والموارد" kicker="سجل المنشآت" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={TYPE_CHIPS} selectedId={type} onSelect={setType} />
        {rows.length > 0 ? (
          <StatLine
            label="المنشآت المعروضة"
            value={`${rows.length}`}
            hint={`${rows.filter((f) => f.status === "ACTIVE").length} متاحة`}
          />
        ) : null}
        {facilities.isLoading ? (
          <SkeletonList rows={8} />
        ) : facilities.isError ? (
          <ErrorState message="تعذّر تحميل سجل المنشآت." onRetry={() => facilities.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا منشآت بعد" message="لم تُسجَّل منشآت بعد — المعامل والورش وقاعات الدرس." />
        ) : (
          <RowList>
            {rows.map((f, i) => (
              <LedgerRow
                key={f.id}
                last={i === rows.length - 1}
                accessibilityLabel={f.nameAr}
                onPress={() => router.push(`/institution/facilities/${f.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{f.nameAr}</T>
                    <T variant="xs" color="muted">
                      {labelOf(FACILITY_TYPE_LABELS, f.type)}
                      {f.capacity ? ` · سعة ${f.capacity}` : ""}
                      {f.building ? ` · مبنى ${f.building}` : ""}
                    </T>
                  </View>
                  <Badge label={labelOf(FACILITY_STATUS_LABELS, f.status)} tone={toneOf(f.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
