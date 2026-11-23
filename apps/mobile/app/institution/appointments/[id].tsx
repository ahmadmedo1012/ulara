import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useAppointment } from "@/features/institutional/queries";
import {
  APPOINTMENT_STATUS_LABELS, ORG_UNIT_TYPE_LABELS, POSITION_CATEGORY_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/appointments/[id] — the appointment record (web
 * AppointmentDetailPage parity, read surface): person + position +
 * unit + dates + the statutory decision reference.
 */
export default function InstitutionAppointmentDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const appointment = useAppointment(id || null);

  const data = appointment.data ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title={data?.position?.titleAr ?? "سجل التعيين"} kicker="المناصب والتعيينات" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
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
                <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              <T variant="sm" color="muted">{data.person?.displayName ?? "فرد غير مرتبط"}</T>
              {data.person?.staffNumber ? (
                <T variant="xs" color="faint">الرقم الوظيفي: {data.person.staffNumber}</T>
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
              value={`${data.startDate} ← ${data.endDate ?? "مستمر"}`}
              hint={data.decisionRef ? `مرجع القرار: ${data.decisionRef}` : undefined}
            />
            {data.notes ? (
              <RowList>
                <LedgerRow last>
                  <T variant="xs" color="muted">{data.notes}</T>
                </LedgerRow>
              </RowList>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
