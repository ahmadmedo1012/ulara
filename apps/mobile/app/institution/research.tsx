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
import { useResearchProjects } from "@/features/institutional/queries";
import { RESEARCH_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "PROPOSED", label: RESEARCH_STATUS_LABELS.PROPOSED },
  { id: "ACTIVE", label: RESEARCH_STATUS_LABELS.ACTIVE },
  { id: "COMPLETED", label: RESEARCH_STATUS_LABELS.COMPLETED },
  { id: "TERMINATED", label: RESEARCH_STATUS_LABELS.TERMINATED },
];

/**
 * /institution/research — the institutional research register (web
 * ResearchPage parity, read surface): the institution's own projects
 * with field/status + the principal investigator. Kind-gated: the
 * section only exists for higher-education kinds (the registry's
 * foreignToKind hides it for intermediate institutes and vocational
 * centers — Law 21/2023 stages 1–2 carry no research mandate).
 */
export default function InstitutionResearch() {
  const p = usePalette();
  const [status, setStatus] = useState("");
  const projects = useResearchProjects({ status: status || undefined, limit: 50 });

  const rows = Array.isArray(projects.data) ? projects.data : projects.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="البحث المؤسسي" kicker="سجل المشاريع" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        {rows.length > 0 ? (
          <StatLine
            label="المشاريع المعروضة"
            value={`${rows.length}`}
            hint={`${rows.filter((r) => r.status === "ACTIVE").length} نشطة`}
          />
        ) : null}
        {projects.isLoading ? (
          <SkeletonList rows={6} />
        ) : projects.isError ? (
          <ErrorState message="تعذّر تحميل المشاريع البحثية." onRetry={() => projects.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا مشاريع بعد" message="لا مشاريع بحثية مؤسسية مسجلة بعد." />
        ) : (
          <RowList>
            {rows.map((pr, i) => (
              <LedgerRow
                key={pr.id}
                last={i === rows.length - 1}
                accessibilityLabel={pr.titleAr}
                onPress={() => router.push(`/institution/research/${pr.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium" numberOfLines={2}>{pr.titleAr}</T>
                    <T variant="xs" color="muted">
                      {pr.field ?? "—"}
                      {pr.principalInvestigator ? ` · بإشراف ${pr.principalInvestigator.displayName}` : ""}
                    </T>
                  </View>
                  <Badge label={labelOf(RESEARCH_STATUS_LABELS, pr.status)} tone={toneOf(pr.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
