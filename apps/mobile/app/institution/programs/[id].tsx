import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useProgram } from "@/features/institutional/queries";
import { PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS, VERSION_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

/**
 * /institution/programs/[id] — the program record (web
 * ProgramDetailPage parity, read surface): kind + status + the owning
 * unit + the credential type + the version history with effective
 * dates and approval references.
 */
export default function InstitutionProgramDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const program = useProgram(id || null);
  const data = program.data ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title={data?.nameAr ?? "سجل البرنامج"} kicker="البرامج والخطط" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
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
              <T variant="sm" color="muted">{labelOf(PROGRAM_KIND_LABELS, data.kind)}</T>
              {data.code ? <T variant="xs" color="faint">الرمز: {data.code}</T> : null}
              {data.orgUnit ? <T variant="xs" color="faint">الوحدة: {data.orgUnit.nameAr}</T> : null}
              {data.credentialType ? (
                <T variant="xs" color="faint">الشهادة: {data.credentialType.nameAr}</T>
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
    </View>
  );
}
