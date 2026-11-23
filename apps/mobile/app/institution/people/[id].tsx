import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { usePerson } from "@/features/institutional/queries";
import {
  STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS, APPOINTMENT_STATUS_LABELS,
  PLATFORM_ROLE_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/people/[id] — the person record (web PersonDetailPage
 * parity, read surface): identity + contact + the platform account
 * link + the appointment history with positions/units.
 */
export default function InstitutionPersonDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const person = usePerson(id || null);

  const data = person.data ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader
        title={data?.displayName ?? "سجل الفرد"}
        kicker="الأفراد والكوادر"
      />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
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
                <T variant="h3" weight="bold">{data.displayName}</T>
                <Badge label={labelOf(STAFF_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              <T variant="sm" color="muted">{labelOf(STAFF_CATEGORY_LABELS, data.category)}</T>
              {data.staffNumber ? (
                <T variant="xs" color="faint">الرقم الوظيفي: {data.staffNumber}</T>
              ) : null}
              {data.primaryOrgUnit ? (
                <T variant="xs" color="faint">الوحدة الأساسية: {data.primaryOrgUnit.nameAr}</T>
              ) : null}
              {data.contactEmail ? (
                <T variant="xs" color="faint">{data.contactEmail}</T>
              ) : null}
              {data.contactPhone ? (
                <T variant="xs" color="faint">{data.contactPhone}</T>
              ) : null}
            </View>

            {data.platformUser ? (
              <StatLine
                label="حساب المنصة"
                value={labelOf(PLATFORM_ROLE_LABELS, data.platformUser.role)}
                hint={data.platformUser.email}
              />
            ) : (
              <StatLine label="حساب المنصة" value="بلا حساب" hint="فرد بلا منصة — سجل وظيفي فقط" />
            )}

            <T variant="h4" weight="bold">التعيينات</T>
            {(data.appointments ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا تعيينات مسجلة لهذا الفرد.</T>
            ) : (
              <RowList>
                {(data.appointments ?? []).map((a, i, arr) => (
                  <LedgerRow key={a.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{a.position?.titleAr ?? "منصب غير مسمى"}</T>
                        <T variant="xs" color="muted">
                          {a.orgUnit?.nameAr ?? "—"}
                          {" · "}
                          {a.startDate}
                          {a.endDate ? ` ← ${a.endDate}` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(APPOINTMENT_STATUS_LABELS, a.status)} tone={toneOf(a.status)} />
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
