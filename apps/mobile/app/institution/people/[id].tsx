import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { usePerson } from "@/features/institutional/queries";
import {
  STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS, APPOINTMENT_STATUS_LABELS,
  CAPABILITY_LABELS, labelOf,
} from "@/features/institutional/labels";

/**
 * /institution/people/[id] — the person record (web PersonDetailPage
 * parity, read surface): the wire's { person, appointments,
 * unitCapabilityGrants } aggregate (GET /institutional/people/:id) —
 * identity + contact + the appointment history with positions/units,
 * and the person's own scoped grants. The page scrolls to the last
 * element (Screen scroll — one scroller); appointments are the
 * ACTIVE/SCHEDULED ones the server sends (bounded take 20, honestly
 * labeled).
 */
export default function InstitutionPersonDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const person = usePerson(id || null);

  const detail = person.data ?? null;
  const data = detail?.person ?? null;

  return (
    <Screen scroll padded={false}>
      <StackHeader
        title={data?.fullNameAr ?? "سجل الفرد"}
        kicker="الأفراد والكوادر"
      />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {person.isLoading ? (
          <SkeletonList rows={6} />
        ) : person.isError ? (
          <ErrorState message="تعذّر تحميل سجل الفرد." onRetry={() => person.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد السجل" message="هذا الفرد غير موجود في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.fullNameAr}</T>
                <Badge label={labelOf(STAFF_STATUS_LABELS, data.staffStatus)} />
              </View>
              {data.fullNameEn ? (
                <T variant="sm" color="muted">{data.fullNameEn}</T>
              ) : null}
              <T variant="sm" color="muted">{labelOf(STAFF_CATEGORY_LABELS, data.category)}</T>
              {data.staffNumber ? (
                <T variant="xs" color="faint">الرقم الوظيفي: {data.staffNumber}</T>
              ) : null}
              {data.hiredAt ? (
                <T variant="xs" color="faint">التعيين: {data.hiredAt.slice(0, 10)}</T>
              ) : null}
              {data.email ? (
                <T variant="xs" color="faint">{data.email}</T>
              ) : null}
              {data.phone ? (
                <T variant="xs" color="faint">{data.phone}</T>
              ) : null}
              {data.notes ? (
                <T variant="xs" color="faint" numberOfLines={4}>{data.notes}</T>
              ) : null}
            </View>

            {/* the person's own scoped grants (contract §12 rows) — the
                grants the person HOLDS, readable here, managed from the
                access screen. */}
            {(detail?.unitCapabilityGrants ?? []).length > 0 ? (
              <>
                <T variant="h4" weight="bold">منحه الصريحة للصلاحيات</T>
                <RowList>
                  {detail!.unitCapabilityGrants.map((g, i, arr) => (
                    <LedgerRow key={g.id} last={i === arr.length - 1}>
                      <T variant="sm" color="muted">
                        {labelOf(CAPABILITY_LABELS, g.capability)}
                        {g.reason ? ` · ${g.reason}` : ""}
                      </T>
                    </LedgerRow>
                  ))}
                </RowList>
              </>
            ) : null}

            <T variant="h4" weight="bold">التعيينات السارية</T>
            {(detail?.appointments ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا تعيينات سارية مسجلة لهذا الفرد.</T>
            ) : (
              <RowList>
                {detail!.appointments.map((a, i, arr) => (
                  <LedgerRow key={a.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{a.position?.titleAr ?? "منصب غير مسمى"}</T>
                        <T variant="xs" color="muted">
                          {a.startDate.slice(0, 10)}
                          {a.endDate ? ` ← ${a.endDate.slice(0, 10)}` : " · مستمر"}
                        </T>
                      </View>
                      <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, a.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}
            {(detail?.appointments ?? []).length >= 20 ? (
              <T variant="xs" color="faint">
                يعرض أول 20 تعييناً سارياً — السجل الكامل عند إدارة المؤسسة.
              </T>
            ) : null}

            <StatLine
              label="حساب المنصة"
              value={data.userId ? "مرتبط" : "بلا حساب"}
              hint={data.userId ? "مرتبط بحساب مستخدم — يُدار من شاشة الصلاحيات" : "فرد بلا منصة — سجل وظيفي فقط"}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
