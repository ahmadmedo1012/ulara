import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import {
  useFacility, useEquipmentPaged, useReservationsPaged, useWorkOrdersPaged,
  useSafetyIncidentsPaged, useMyCapabilities, useCreateReservation,
} from "@/features/institutional/queries";
import {
  FACILITY_TYPE_LABELS, FACILITY_STATUS_LABELS, EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_CONDITION_LABELS, RESERVATION_STATUS_LABELS, WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_KIND_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/facilities/[id] — the facility record (web
 * FacilityDetailPage parity): the facility's own facts (type, status,
 * capacity, safety notes + the register counts) + its equipment + its
 * reservations (with the CREATE reservation write — gated by the
 * server's FACILITIES_MANAGE capability) + its maintenance work
 * orders and safety incidents. The page is ONE scrolling surface
 * (Screen scroll — every section and the booking form's buttons are
 * reachable; sub-registers are bounded per the web's own detail
 * surfaces with the server's honest counts when more exist).
 */
export default function InstitutionFacilityDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const facility = useFacility(id || null);
  const equipment = useEquipmentPaged({ facilityId: id || undefined });
  const reservations = useReservationsPaged({ facilityId: id || undefined });
  const workOrders = useWorkOrdersPaged();
  const incidents = useSafetyIncidentsPaged();
  const caps = useMyCapabilities();
  const canBook = caps.data?.has("FACILITIES_MANAGE") ?? false;

  const data = facility.data ?? null;
  /* the work-orders / safety-incidents registers cannot be filtered by
   * facility server-side (the contract's filters are status/equipment
   * only — web parity: the client filters the loaded page). */
  const workOrderRows = workOrders.items.filter((w) => w.facility?.id === id);
  const incidentRows = incidents.items.filter((w) => w.facility?.id === id);

  return (
    <Screen scroll padded={false}>
      <StackHeader title={data?.nameAr ?? "سجل المنشأة"} kicker="المعامل والموارد" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
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
              {data.capacity != null ? <T variant="xs" color="faint">السعة: {data.capacity}</T> : null}
              {data.building || data.room ? (
                <T variant="xs" color="faint">
                  الموقع: {data.building ?? "—"}{data.room ? ` / ${data.room}` : ""}
                </T>
              ) : null}
              {data.orgUnit ? (
                <T variant="xs" color="faint">الوحدة: {data.orgUnit.nameAr}</T>
              ) : null}
              {data.safetyNotes ? (
                <T variant="xs" color="faint">ملاحظات السلامة: {data.safetyNotes}</T>
              ) : null}
              <View style={{ gap: 2, paddingTop: sp[4] }}>
                <T variant="xs" color="faint">
                  المعدات: {latn(data._count?.equipment ?? equipment.meta?.total ?? equipment.items.length)}
                  {" · "}أوامر الصيانة: {data._count?.workOrders != null ? latn(data._count.workOrders) : "—"}
                  {" · "}حوادث السلامة: {data._count?.incidents != null ? latn(data._count.incidents) : "—"}
                </T>
              </View>
            </View>

            {/* ── the equipment register ── */}
            <T variant="h4" weight="bold">المعدات</T>
            {equipment.isLoading ? (
              <SkeletonList rows={3} />
            ) : equipment.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل معدات هذه المنشأة.</T>
            ) : equipment.items.length === 0 ? (
              <T variant="sm" color="muted">لا معدات مسجلة لهذه المنشأة.</T>
            ) : (
              <>
                <RowList>
                  {equipment.items.map((eq) => (
                    <LedgerRow key={eq.id} last={eq === equipment.items[equipment.items.length - 1]}>
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
                {equipment.meta && equipment.meta.total > equipment.items.length ? (
                  <T variant="xs" color="faint">
                    {latn(equipment.items.length)} من {latn(equipment.meta.total)} معدة — القائمة الكاملة من سجل المعدات.
                  </T>
                ) : null}
              </>
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
            ) : reservations.items.length === 0 ? (
              <T variant="sm" color="muted">لا حجوزات لهذه المنشأة بعد.</T>
            ) : (
              <RowList>
                {reservations.items.map((r) => (
                  <LedgerRow key={r.id} last={r === reservations.items[reservations.items.length - 1]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{r.purpose}</T>
                        <T variant="xs" color="muted">
                          {r.startsAt.slice(0, 16).replace("T", " ")} → {r.endsAt.slice(0, 16).replace("T", " ")}
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
            {workOrders.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل أوامر الصيانة.</T>
            ) : workOrderRows.length === 0 ? (
              <T variant="sm" color="muted">لا أوامر صيانة لهذه المنشأة.</T>
            ) : (
              <RowList>
                {workOrderRows.map((w) => (
                  <LedgerRow key={w.id} last={w === workOrderRows[workOrderRows.length - 1]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{w.titleAr}</T>
                        <T variant="xs" color="muted">
                          {labelOf(WORK_ORDER_KIND_LABELS, w.kind)}
                          {w.equipment ? ` · ${w.equipment.nameAr}` : ""}
                          {w.scheduledDate ? ` · ${w.scheduledDate.slice(0, 10)}` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(WORK_ORDER_STATUS_LABELS, w.status)} tone={toneOf(w.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            {/* ── safety incidents (the register count's rows) ── */}
            {incidentRows.length > 0 ? (
              <>
                <T variant="h4" weight="bold">حوادث السلامة</T>
                <RowList>
                  {incidentRows.map((it) => (
                    <LedgerRow key={it.id} last={it === incidentRows[incidentRows.length - 1]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <T variant="body" weight="medium">{it.titleAr}</T>
                          <T variant="xs" color="muted">
                            {it.kind}
                            {it.severity ? ` · ${it.severity}` : ""}
                            {` · ${it.occurredAt.slice(0, 10)}`}
                          </T>
                        </View>
                        <Badge label={it.status} />
                      </View>
                    </LedgerRow>
                  ))}
                </RowList>
              </>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

/* ── the booking form (gated by FACILITIES_MANAGE) ─────────────── */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Compose a date + optional time into an ISO instant, in the USER'S
 *  timezone (the device's local clock — never an ambiguous text sent
 *  as-if UTC): the wall time the registrar means is what the server
 *  books. Returns null when the parts are malformed. */
function composeIso(date: string, time: string | null): string | null {
  if (!DATE_RE.test(date.trim())) return null;
  const [y, m, d] = date.trim().split("-").map(Number);
  let hh = 0, mm = 0;
  if (time) {
    if (!TIME_RE.test(time.trim())) return null;
    [hh, mm] = time.trim().split(":").map(Number);
  }
  const composed = new Date(y, m - 1, d, hh, mm);
  if (
    composed.getFullYear() !== y || composed.getMonth() !== m - 1 ||
    composed.getDate() !== d || composed.getHours() !== hh || composed.getMinutes() !== mm
  ) {
    return null; // e.g. 2027-02-31 — the calendar's own refusal
  }
  return composed.toISOString();
}

function BookingForm({ facilityId }: { facilityId: string }) {
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const create = useCreateReservation();

  const submit = async () => {
    if (!purpose.trim()) {
      toast.error("الغرض مطلوب.", "حجز منشأة");
      return;
    }
    const startsAt = composeIso(startDate, startTime || null);
    const endsAt = composeIso(endDate, endTime || null);
    if (!startsAt || !endsAt) {
      toast.error("التواريخ بصيغة YYYY-MM-DD، والوقت اختياري بصيغة HH:MM.", "حجز منشأة");
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      toast.error("نهاية الحجز يجب أن تكون بعد بدايته.", "حجز منشأة");
      return;
    }
    try {
      await create.mutateAsync({
        facilityId,
        purpose: purpose.trim(),
        startsAt,
        endsAt,
      });
      toast.success("طُلب الحجز للمنشأة.", "حجز منشأة");
      setPurpose("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
    } catch (e) {
      /* the server's own words: 409 RESERVATION_OVERLAP / 409
       * FACILITY_NOT_OPERATIONAL / 400 RESERVATION_WINDOW_INVALID. */
      toast.error(humanizeError(e), "تعذّر إنشاء الحجز");
    }
  };

  return (
    <View style={{ gap: sp[8] }}>
      <Field label="الغرض" value={purpose} onChangeText={setPurpose} placeholder="مثال: حصّة معمل الشبكات" />
      <Field label="يبدأ — التاريخ (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2027-03-01" />
      <Field label="يبدأ — الوقت (اختياري HH:MM)" value={startTime} onChangeText={setStartTime} placeholder="08:00" />
      <Field label="ينتهي — التاريخ (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2027-03-01" />
      <Field label="ينتهي — الوقت (اختياري HH:MM)" value={endTime} onChangeText={setEndTime} placeholder="09:00" />
      <Button
        label={create.isPending ? "جارٍ الحجز…" : "حجز المنشأة"}
        disabled={create.isPending || !purpose.trim()}
        onPress={submit}
      />
    </View>
  );
}
