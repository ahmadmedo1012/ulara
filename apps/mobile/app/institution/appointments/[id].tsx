import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { useAppointment } from "@/features/institutional/queries";
import {
  APPOINTMENT_STATUS_LABELS, ORG_UNIT_TYPE_LABELS, POSITION_CATEGORY_LABELS,
  labelOf,
} from "@/features/institutional/labels";

/**
 * /institution/appointments/[id] — the appointment record (web
 * AppointmentDetailPage parity, read surface): person + position +
 * unit + dates + the statutory decision reference (the wire's
 * decisionNumber/decisionDate — never an invented decisionRef).
 * The page scrolls to the last element.
 */
export default function InstitutionAppointmentDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const appointment = useAppointment(id || null);

  const data = appointment.data ?? null;

  return (
    <Screen scroll padded={false}>
      <StackHeader title={data?.position?.titleAr ?? "سجل التعيين"} kicker="المناصب والتعيينات" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {appointment.isLoading ? (
          <SkeletonList rows={5} />
        ) : appointment.isError ? (
          <ErrorState message="تعذّر تحميل سجل التعيين." onRetry={() => appointment.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد السجل" message="هذا التعيين غير موجود في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.position?.titleAr ?? "منصب غير مسمى"}</T>
                <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, data.status)} />
                {data.acting ? <Badge label="بالوكالة" tone="grey" /> : null}
              </View>
              <T variant="sm" color="muted">{data.person?.fullNameAr ?? "فرد غير مرتبط"}</T>
              {data.person?.fullNameEn ? (
                <T variant="xs" color="faint">{data.person.fullNameEn}</T>
              ) : null}
            </View>

            <StatLine
              label="الوحدة التنظيمية"
              value={data.orgUnit?.nameAr ?? "—"}
              hint={data.orgUnit ? labelOf(ORG_UNIT_TYPE_LABELS, data.orgUnit.type) : undefined}
            />
            {data.position?.category ? (
              <StatLine label="عائلة المنصب" value={labelOf(POSITION_CATEGORY_LABELS, data.position.category)} />
            ) : null}
            <StatLine
              label="الفترة"
              value={`${data.startDate.slice(0, 10)} ← ${data.endDate ? data.endDate.slice(0, 10) : "مستمر"}`}
              hint={data.termMonths != null ? `مدة النصاب: ${data.termMonths} شهراً` : undefined}
            />
            {data.decisionNumber || data.decisionDate ? (
              <StatLine
                label="مرجع القرار"
                value={data.decisionNumber ?? "—"}
                hint={data.decisionDate ? `تاريخ القرار: ${data.decisionDate.slice(0, 10)}` : undefined}
              />
            ) : null}
            {data.appointedByAuthority ? (
              <StatLine label="جهة التعيين" value={data.appointedByAuthority} />
            ) : null}
            {data.notes ? (
              <RowList>
                <LedgerRow last>
                  <T variant="xs" color="muted" numberOfLines={6}>{data.notes}</T>
                </LedgerRow>
              </RowList>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
