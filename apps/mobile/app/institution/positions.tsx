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
import { useAppointments } from "@/features/institutional/queries";
import { APPOINTMENT_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "SCHEDULED", label: APPOINTMENT_STATUS_LABELS.SCHEDULED },
  { id: "ACTIVE", label: APPOINTMENT_STATUS_LABELS.ACTIVE },
  { id: "ENDED", label: APPOINTMENT_STATUS_LABELS.ENDED },
  { id: "CANCELLED", label: APPOINTMENT_STATUS_LABELS.CANCELLED },
];

/**
 * /institution/positions — the appointments register (web
 * PositionsPage parity, read surface): who holds which statutory
 * position in which unit, live-filtered by status. Tapping a
 * appointment opens the record (position + unit + dates + decision).
 */
export default function InstitutionPositions() {
  const p = usePalette();
  const [status, setStatus] = useState("");
  const appointments = useAppointments({ status: status || undefined, limit: 50 });

  const rows = Array.isArray(appointments.data) ? appointments.data : appointments.data?.data ?? [];
  const activeCount = rows.filter((a) => a.status === "ACTIVE").length;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="المناصب والتعيينات" kicker="سجل التعيينات" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        {rows.length > 0 ? (
          <StatLine
            label="التعيينات المعروضة"
            value={`${rows.length}`}
            hint={`${activeCount} سارية`}
          />
        ) : null}
        {appointments.isLoading ? (
          <SkeletonList rows={8} />
        ) : appointments.isError ? (
          <ErrorState message="تعذّر تحميل التعيينات." onRetry={() => appointments.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا تعيينات" message="سجل التعيينات فارغ لهذه المؤسسة — العميداء والوكلاء ورؤساء الأقسام يظهرون هنا." />
        ) : (
          <RowList>
            {rows.map((a, i) => (
              <LedgerRow
                key={a.id}
                last={i === rows.length - 1}
                accessibilityLabel={a.person?.displayName ?? a.id}
                onPress={() => router.push(`/institution/appointments/${a.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{a.person?.displayName ?? "فرد غير مرتبط"}</T>
                    <T variant="xs" color="muted">
                      {a.position?.titleAr ?? "منصب غير مسمى"}
                      {" · "}
                      {a.orgUnit?.nameAr ?? "—"}
                    </T>
                  </View>
                  <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, a.status)} tone={toneOf(a.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
