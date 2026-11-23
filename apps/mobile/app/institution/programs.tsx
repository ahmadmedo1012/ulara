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
import { usePrograms } from "@/features/institutional/queries";
import { PROGRAM_KIND_LABELS, PROGRAM_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "ACTIVE", label: PROGRAM_STATUS_LABELS.ACTIVE },
  { id: "APPROVED", label: PROGRAM_STATUS_LABELS.APPROVED },
  { id: "DRAFT", label: PROGRAM_STATUS_LABELS.DRAFT },
  { id: "SUSPENDED", label: PROGRAM_STATUS_LABELS.SUSPENDED },
  { id: "CLOSED", label: PROGRAM_STATUS_LABELS.CLOSED },
];

/**
 * /institution/programs — the programs register (web ProgramsPage
 * parity, read surface): academic/technical/professional programs
 * with kind + status + the owning unit; tapping opens the program
 * record (versions + credential type).
 */
export default function InstitutionPrograms() {
  const p = usePalette();
  const [status, setStatus] = useState("");
  const programs = usePrograms({ status: status || undefined, limit: 50 });

  const rows = Array.isArray(programs.data) ? programs.data : programs.data?.data ?? [];
  const activeCount = rows.filter((pr) => pr.status === "ACTIVE").length;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="البرامج والخطط" kicker="سجل البرامج" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        {rows.length > 0 ? (
          <StatLine label="البرامج المعروضة" value={`${rows.length}`} hint={`${activeCount} نشطة`} />
        ) : null}
        {programs.isLoading ? (
          <SkeletonList rows={8} />
        ) : programs.isError ? (
          <ErrorState message="تعذّر تحميل البرامج." onRetry={() => programs.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا برامج بعد" message="لم تُعتمد برامج لهذه المؤسسة بعد — البرامج الأكاديمية والتقنية والمهنية." />
        ) : (
          <RowList>
            {rows.map((pr, i) => (
              <LedgerRow
                key={pr.id}
                last={i === rows.length - 1}
                accessibilityLabel={pr.nameAr}
                onPress={() => router.push(`/institution/programs/${pr.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{pr.nameAr}</T>
                    <T variant="xs" color="muted">
                      {labelOf(PROGRAM_KIND_LABELS, pr.kind)}
                      {pr.code ? ` · ${pr.code}` : ""}
                      {pr.orgUnit ? ` · ${pr.orgUnit.nameAr}` : ""}
                    </T>
                  </View>
                  <Badge label={labelOf(PROGRAM_STATUS_LABELS, pr.status)} tone={toneOf(pr.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
