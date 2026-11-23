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
import { useAppointmentsPaged } from "@/features/institutional/queries";
import type { Appointment } from "@/api/institutional";
import { APPOINTMENT_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "SCHEDULED", label: APPOINTMENT_STATUS_LABELS.SCHEDULED },
  { id: "ACTIVE", label: APPOINTMENT_STATUS_LABELS.ACTIVE },
  { id: "ENDED", label: APPOINTMENT_STATUS_LABELS.ENDED },
  { id: "CANCELLED", label: APPOINTMENT_STATUS_LABELS.CANCELLED },
];

/** The appointment row — memoized at module scope (FlashList purity). */
const AppointmentRow = makeRow<Appointment>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.person?.fullNameAr ?? item.id}
      onPress={() => router.push(`/institution/appointments/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.person?.fullNameAr ?? "فرد غير مرتبط"}</T>
          <T variant="xs" color="muted">
            {item.position?.titleAr ?? "منصب غير مسمى"}
            {item.acting ? " (بالوكالة)" : ""}
            {" · "}
            {item.orgUnit?.nameAr ?? "—"}
          </T>
        </View>
        <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/positions — the appointments register (web
 * PositionsPage parity, read surface): who holds which statutory
 * position in which unit, live-filtered by status. Tapping an
 * appointment opens the record (position + unit + dates + decision).
 * DataList + usePagedList — every page reachable.
 */
export default function InstitutionPositions() {
  const [status, setStatus] = useState("");
  const appointments = useAppointmentsPaged({ status: status || undefined });
  const total = appointments.meta?.total ?? appointments.items.length;
  const activeCount = appointments.items.filter((a) => a.status === "ACTIVE").length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="المناصب والتعيينات" kicker="سجل التعيينات" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        <T variant="xs" color="faint">
          {latn(appointments.items.length)} معروضاً{total > appointments.items.length ? ` من ${latn(total)}` : ""}
          {` · ${latn(activeCount)} سارية`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={appointments.items}
          renderItem={({ item }) => <AppointmentRow item={item} />}
          keyExtractor={(a) => a.id}
          isLoading={appointments.isLoading}
          isError={appointments.isError}
          emptyTitle="لا تعيينات"
          emptyMessage="سجل التعيينات فارغ لهذه المؤسسة — العميداء والوكلاء ورؤساء الأقسام يظهرون هنا."
          onRetry={() => appointments.refetch()}
          refetch={appointments.refetch}
          isRefetching={appointments.isRefetching}
          onEndReached={appointments.onEndReached}
          isFetchingNextPage={appointments.isFetchingNextPage}
          hasNextPage={appointments.hasNextPage}
          loadMoreError={appointments.loadMoreError}
          onRetryLoadMore={appointments.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
