import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { useProgram } from "@/features/institutional/queries";
import { PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS, VERSION_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

/**
 * /institution/programs/[id] — the program record (web
 * ProgramDetailPage parity, read surface): kind + status + the owning
 * unit + the credential type + the version history with effective
 * dates and approval references. The page scrolls to the last
 * version row.
 */
export default function InstitutionProgramDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const program = useProgram(id || null);
  const data = program.data ?? null;

  return (
    <Screen scroll padded={false}>
      <StackHeader title={data?.nameAr ?? "سجل البرنامج"} kicker="البرامج والخطط" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {program.isLoading ? (
          <SkeletonList rows={5} />
        ) : program.isError ? (
          <ErrorState message="تعذّر تحميل سجل البرنامج." onRetry={() => program.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد البرنامج" message="هذا البرنامج غير موجود في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">{data.nameAr}</T>
                <Badge label={labelOf(PROGRAM_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              {data.nameEn ? (
                <T variant="sm" color="muted">{data.nameEn}</T>
              ) : null}
              <T variant="sm" color="muted">{labelOf(PROGRAM_KIND_LABELS, data.kind)}</T>
              {data.code ? <T variant="xs" color="faint">الرمز: {data.code}</T> : null}
              {data.orgUnit ? <T variant="xs" color="faint">الوحدة: {data.orgUnit.nameAr}</T> : null}
              {data.credentialType ? (
                <T variant="xs" color="faint">الشهادة: {data.credentialType.nameAr}</T>
              ) : null}
              {data.durationMonths != null ? (
                <T variant="xs" color="faint">المدة: {data.durationMonths} شهراً</T>
              ) : null}
              {data.totalCreditHours != null ? (
                <T variant="xs" color="faint">الساعات المعتمدة: {data.totalCreditHours}</T>
              ) : null}
              {data.approvalRef ? (
                <T variant="xs" color="faint">مرجع الاعتماد: {data.approvalRef}</T>
              ) : null}
            </View>

            <T variant="h4" weight="bold">إصدارات الخطة</T>
            {(data.versions ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا إصدارات معتمدة لهذا البرنامج بعد.</T>
            ) : (
              <RowList>
                {(data.versions ?? []).map((v, i, arr) => (
                  <LedgerRow key={v.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{v.label}</T>
                        <T variant="xs" color="muted">
                          {v.effectiveFrom ? `سارية من ${v.effectiveFrom.slice(0, 10)}` : "بلا تاريخ سريان"}
                          {v.approvalRef ? ` · مرجع الاعتماد: ${v.approvalRef}` : ""}
                          {v._count?.courses != null ? ` · ${v._count.courses} مقرراً` : ""}
                        </T>
                      </View>
                      <Badge label={labelOf(VERSION_STATUS_LABELS, v.status)} tone={toneOf(v.status)} />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
