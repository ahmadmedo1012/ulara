import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { ChipGroup } from "@/components/ui/fields";
import { EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useMyInstitutionProfile, useResearchProjectsPaged } from "@/features/institutional/queries";
import { sectionHiddenReason } from "@/features/institutional/sections";
import type { ResearchProject } from "@/api/institutional";
import { RESEARCH_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "PROPOSED", label: RESEARCH_STATUS_LABELS.PROPOSED },
  { id: "ACTIVE", label: RESEARCH_STATUS_LABELS.ACTIVE },
  { id: "COMPLETED", label: RESEARCH_STATUS_LABELS.COMPLETED },
  { id: "TERMINATED", label: RESEARCH_STATUS_LABELS.TERMINATED },
];

/** The research project row — memoized at module scope (FlashList purity). */
const ResearchRow = makeRow<ResearchProject>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.titleAr}
      onPress={() => router.push(`/institution/research/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium" numberOfLines={2}>{item.titleAr}</T>
          <T variant="xs" color="muted">
            {item.field ?? "—"}
            {item.principalInvestigator ? ` · بإشراف ${item.principalInvestigator.fullNameAr}` : ""}
            {typeof item.memberCount === "number" ? ` · ${item.memberCount} باحثاً` : ""}
          </T>
        </View>
        <Badge label={labelOf(RESEARCH_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/research — the institutional research register (web
 * ResearchPage parity, read surface). The DEEP-LINK kind rule (§7):
 * hiding the nav row never protected the route itself — a foreign-kind
 * session (Law 21/2023 stages 1–2: intermediate institutes and
 * vocational-training centers carry no research mandate, LEGAL-MATRIX
 * §A.3) deep-linking here gets the honest explanatory state (web
 * ModuleHiddenState parity) and NO research reads fire (the paged
 * hook stays disabled until the profile resolves the kind).
 */
export default function InstitutionResearch() {
  const [status, setStatus] = useState("");
  const profile = useMyInstitutionProfile();
  const kind = profile.data?.kind?.code ?? null;
  /* Unknown until the profile resolves → queries stay OFF (no foreign
   * reads, no premature empty state). */
  const kindKnown = profile.data != null;
  const hiddenReason = kindKnown ? sectionHiddenReason("/institution/research", kind) : null;

  const projects = useResearchProjectsPaged(
    { status: status || undefined },
    /* enabled: scope + NOT a foreign kind (hidden ⇒ disabled). */
    kindKnown && hiddenReason === null,
  );
  const total = projects.meta?.total ?? projects.items.length;

  if (hiddenReason) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title="البحث المؤسسي" kicker="سجل المشاريع" />
        <View style={{ flex: 1, padding: sp[16] }}>
          <EmptyState
            title="القسم غير مفعّل لنوع مؤسستك"
            message={hiddenReason}
            actionLabel="الرجوع إلى مساحة العمل"
            onAction={() => router.push("/institution" as never)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="البحث المؤسسي" kicker="سجل المشاريع" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        <T variant="xs" color="faint">
          {latn(projects.items.length)} معروضاً{total > projects.items.length ? ` من ${latn(total)} وفق سجل المشاريع` : ""}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={projects.items}
          renderItem={({ item }) => <ResearchRow item={item} />}
          keyExtractor={(pr) => pr.id}
          isLoading={projects.isLoading}
          isError={projects.isError}
          emptyTitle="لا مشاريع بعد"
          emptyMessage="لا مشاريع بحثية مؤسسية مسجلة بعد."
          onRetry={() => projects.refetch()}
          refetch={projects.refetch}
          isRefetching={projects.isRefetching}
          onEndReached={projects.onEndReached}
          isFetchingNextPage={projects.isFetchingNextPage}
          hasNextPage={projects.hasNextPage}
          loadMoreError={projects.loadMoreError}
          onRetryLoadMore={projects.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
