import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { useFacility, useEquipment, useReservations, useWorkOrders, useMyCapabilities, useCreateReservation } from "@/features/institutional/queries";
import {
  FACILITY_TYPE_LABELS, FACILITY_STATUS_LABELS, EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_CONDITION_LABELS, RESERVATION_STATUS_LABELS, WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_KIND_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/facilities/[id] — the facility record (web
 * FacilityDetailPage parity): the facility's own facts (type, status,
 * capacity, safety notes) + its equipment + its reservations (with
 * the CREATE reservation write — gated by the server's
 * FACILITIES_MANAGE capability) + its maintenance work orders.
 */
export default function InstitutionFacilityDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const facility = useFacility(id || null);
  const equipment = useEquipment({ facilityId: id || undefined, limit: 50 });
  const reservations = useReservations({ facilityId: id || undefined, limit: 50 });
  const workOrders = useWorkOrders({ limit: 20 });
  const caps = useMyCapabilities();
  const canBook = caps.data?.has("FACILITIES_MANAGE") ?? false;

  const data = facility.data ?? null;
  const equipmentRows = Array.isArray(equipment.data) ? equipment.data : equipment.data?.data ?? [];
  const reservationRows = Array.isArray(reservations.data) ? reservations.data : reservations.data?.data ?? [];
  const workOrderRows = (Array.isArray(workOrders.data) ? workOrders.data : workOrders.data?.data ?? [])
    .filter((w) => w.facility?.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title={data?.nameAr ?? "سجل المنشأة"} kicker="المعامل والموارد" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        {facility.isLoading ? (
          <SkeletonList rows={5} />
        ) : facility.isError ? (
          <ErrorState message="تعذّر تحميل سجل المنشأة." onRetry={() => facility.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد المنشأة" message="هذه المنشأة غير موجودة في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.nameAr}</T>
                <Badge label={labelOf(FACILITY_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              <T variant="sm" color="muted">
                {labelOf(FACILITY_TYPE_LABELS, data.type)}
                {data.code ? ` · ${data.code}` : ""}
              </T>
              {data.capacity ? <T variant="xs" color="faint">السعة: {data.capacity}</T> : null}
              {data.building || data.room ? (
                <T variant="xs" color="faint">
                  الموقع: {data.building ?? "—"}{data.room ? ` / ${data.room}` : ""}
                </T>
              ) : null}
              {data.safetyNotes ? (
                <T variant="xs" color="faint">ملاحظات السلامة: {data.safetyNotes}</T>
              ) : null}
            </View>

            {/* ── the equipment register ── */}
            <T variant="h4" weight="bold">المعدات</T>
            {equipment.isLoading ? (
              <SkeletonList rows={3} />
            ) : equipment.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل معدات هذه المنشأة.</T>
            ) : equipmentRows.length === 0 ? (
              <T variant="sm" color="muted">لا معدات مسجلة لهذه المنشأة.</T>
            ) : (
              <RowList>
                {equipmentRows.map((eq, i) => (
                  <LedgerRow key={eq.id} last={i === equipmentRows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{eq.nameAr}</T>
                        <T variant="xs" color="muted">
                          {eq.category ?? "—"}
                          {eq.condition ? ` · ${labelOf(EQUIPMENT_CONDITION_LABELS, eq.condition)}` : ""}
                          {eq.serialNumber ? ` · ${eq.serialNumber}` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(EQUIPMENT_STATUS_LABELS, eq.status)} tone={toneOf(eq.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── reservations + the gated booking write ── */}
            <T variant="h4" weight="bold">الحجوزات</T>
            {canBook ? (
              <BookingForm facilityId={id} />
            ) : (
              <T variant="xs" color="faint">
                إنشاء الحجز يتطلب قدرة «إدارة المعامل والموارد» — الخادم لم يمنحها لعضويتك الحالية.
              </T>
            )}
            {reservations.isLoading ? (
              <SkeletonList rows={2} />
            ) : reservations.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل الحجوزات.</T>
            ) : reservationRows.length === 0 ? (
              <T variant="sm" color="muted">لا حجوزات لهذه المنشأة بعد.</T>
            ) : (
              <RowList>
                {reservationRows.map((r, i) => (
                  <LedgerRow key={r.id} last={i === reservationRows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{r.purpose}</T>
                        <T variant="xs" color="muted">
                          {r.startsAt.slice(0, 16).replace("T", " ")} → {r.endsAt.slice(0, 16).replace("T", " ")}
                          {r.orgUnit ? ` · ${r.orgUnit.nameAr}` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(RESERVATION_STATUS_LABELS, r.status)} tone={toneOf(r.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── the maintenance work orders ── */}
            <T variant="h4" weight="bold">أوامر الصيانة</T>
            {workOrderRows.length === 0 ? (
              <T variant="sm" color="muted">لا أوامر صيانة لهذه المنشأة.</T>
            ) : (
              <RowList>
                {workOrderRows.map((w, i) => (
                  <LedgerRow key={w.id} last={i === workOrderRows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{w.titleAr}</T>
                        <T variant="xs" color="muted">
                          {labelOf(WORK_ORDER_KIND_LABELS, w.kind)}
                          {w.scheduledDate ? ` · ${w.scheduledDate.slice(0, 10)}` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(WORK_ORDER_STATUS_LABELS, w.status)} tone={toneOf(w.status)} />
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

/* ── the booking form (gated by FACILITIES_MANAGE) ─────────────── */

function BookingForm({ facilityId }: { facilityId: string }) {
  const [purpose, setPurpose] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const create = useCreateReservation();

  const isoOk = (v: string) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v.trim());

  const submit = async () => {
    if (!purpose.trim()) {
      toast.error("الغرض مطلوب.", "حجز منشأة");
      return;
    }
    if (!isoOk(startsAt) || !isoOk(endsAt)) {
      toast.error("التاريخ بصيغة YYYY-MM-DD (أو مع الوقت T HH:MM).", "حجز منشأة");
      return;
    }
    try {
      await create.mutateAsync({
        facilityId,
        purpose: purpose.trim(),
        startsAt: startsAt.trim(),
        endsAt: endsAt.trim(),
      });
      toast.success("طُلب الحجز للمنشأة.", "حجز منشأة");
      setPurpose("");
      setStartsAt("");
      setEndsAt("");
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر إنشاء الحجز");
    }
  };

  return (
    <View style={{ gap: sp[8] }}>
      <Field label="الغرض" value={purpose} onChangeText={setPurpose} placeholder="مثال: حصّة معمل الشبكات" />
      <Field label="يبدأ (YYYY-MM-DD)" value={startsAt} onChangeText={setStartsAt} placeholder="2027-03-01" />
      <Field label="ينتهي (YYYY-MM-DD)" value={endsAt} onChangeText={setEndsAt} placeholder="2027-03-01" />
      <Button
        label={create.isPending ? "جارٍ الحجز…" : "حجز المنشأة"}
        disabled={create.isPending || !purpose.trim()}
        onPress={submit}
      />
    </View>
  );
}
