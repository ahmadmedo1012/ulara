import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useMyInstitutionProfile, useResearchProject, useResearchOutputsPaged } from "@/features/institutional/queries";
import { sectionHiddenReason } from "@/features/institutional/sections";
import type { ResearchOutput } from "@/api/institutional";
import {
  RESEARCH_STATUS_LABELS, RESEARCH_MEMBER_ROLE_LABELS, RESEARCH_OUTPUT_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/** The output row — memoized at module scope (FlashList purity). */
const OutputRow = makeRow<ResearchOutput>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium" numberOfLines={2}>{item.title}</T>
          <T variant="xs" color="muted">
            {labelOf(RESEARCH_OUTPUT_LABELS, item.type)}
            {item.person ? ` · ${item.person.fullNameAr}` : ""}
            {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ""}
            {item.doi ? ` · DOI ${item.doi}` : ""}
          </T>
        </View>
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/research/[id] — the project record (web
 * ResearchDetailPage parity, read surface): the research team (with
 * roles + allocation) rides the fixed header; the project's OUTPUTS
 * (publications, patents, prototypes) are the screen's own paged
 * DataList. The DEEP-LINK kind rule (§7) applies here too: a
 * foreign-kind session deep-linking into a research project gets the
 * honest explanatory state and NO project/outputs reads fire.
 */
export default function InstitutionResearchDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const profile = useMyInstitutionProfile();
  const kind = profile.data?.kind?.code ?? null;
  const kindKnown = profile.data != null;
  const hiddenReason = kindKnown ? sectionHiddenReason("/institution/research", kind) : null;

  const project = useResearchProject(id || null, kindKnown && hiddenReason === null);
  const outputs = useResearchOutputsPaged({ projectId: id || undefined }, kindKnown && hiddenReason === null);

  const data = project.data ?? null;
  const total = outputs.meta?.total ?? outputs.items.length;

  if (hiddenReason) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title="سجل المشروع" kicker="البحث المؤسسي" />
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

  if (project.isLoading) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المشروع" kicker="البحث المؤسسي" />
        <View style={{ padding: sp[16] }}>
          <SkeletonList rows={5} />
        </View>
      </Screen>
    );
  }
  if (project.isError) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المشروع" kicker="البحث المؤسسي" />
        <View style={{ padding: sp[16] }}>
          <ErrorState message="تعذّر تحميل سجل المشروع." onRetry={() => project.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen scroll padded={false}>
        <StackHeader title="سجل المشروع" kicker="البحث المؤسسي" />
        <View style={{ padding: sp[16] }}>
          <EmptyState title="لا يوجد المشروع" message="هذا المشروع البحثي غير موجود في هذه المؤسسة." />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title={data.titleAr} kicker="البحث المؤسسي" />
      <View style={{ flex: 1 }}>
        {/* the fixed header: project facts + the research team */}
        <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
          <View style={{ gap: sp[6] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
              <T variant="h3" weight="bold" style={{ flex: 1 }}>{data.titleAr}</T>
              <Badge label={labelOf(RESEARCH_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
            </View>
            {data.titleEn ? <T variant="sm" color="muted">{data.titleEn}</T> : null}
            {data.field ? <T variant="sm" color="muted">{data.field}</T> : null}
            {data.code ? <T variant="xs" color="faint">الرمز: {data.code}</T> : null}
            {data.principalInvestigator ? (
              <T variant="xs" color="faint">الباحث الرئيس: {data.principalInvestigator.fullNameAr}</T>
            ) : null}
            {data.fundingSource ? (
              <T variant="xs" color="faint">مصدر التمويل: {data.fundingSource}</T>
            ) : null}
            {data.budget != null ? (
              <T variant="xs" color="faint">الموازنة: {latn(data.budget)}</T>
            ) : null}
            {data.ethicsApprovalRef ? (
              <T variant="xs" color="faint">موافقة أخلاقيات: {data.ethicsApprovalRef}</T>
            ) : null}
            {data.startsAt || data.endsAt ? (
              <T variant="xs" color="faint">
                {data.startsAt ? data.startsAt.slice(0, 10) : "—"}
                {" ← "}
                {data.endsAt ? data.endsAt.slice(0, 10) : "مستمر"}
              </T>
            ) : null}
          </View>

          <T variant="h4" weight="bold">فريق البحث</T>
          {(data.members ?? []).length === 0 ? (
            <T variant="sm" color="muted">لا فريق مسجل لهذا المشروع.</T>
          ) : (
            <View style={{ gap: sp[6] }}>
              {(data.members ?? []).map((m) => (
                <View key={m.id} style={{ gap: 2 }}>
                  <T variant="body" weight="medium">{m.person?.fullNameAr ?? "غير مرتبط"}</T>
                  <T variant="xs" color="muted">
                    {labelOf(RESEARCH_MEMBER_ROLE_LABELS, m.role)}
                    {m.allocationPct != null ? ` · ${m.allocationPct}% تفرّغ` : ""}
                    {m.leftAt ? " · منتهي العضوية" : ""}
                  </T>
                </View>
              ))}
            </View>
          )}

          <T variant="h4" weight="bold">المخرجات</T>
          <T variant="xs" color="faint">
            {latn(outputs.items.length)} معروضاً{total > outputs.items.length ? ` من ${latn(total)} وفق سجل المشروع` : ""}
          </T>
        </View>

        {/* the outputs register — the screen's own scroller */}
        <View style={{ flex: 1, paddingTop: sp[8] }}>
          <DataList
            data={outputs.items}
            renderItem={({ item }) => <OutputRow item={item} />}
            keyExtractor={(o) => o.id}
            isLoading={outputs.isLoading}
            isError={outputs.isError}
            emptyTitle="لا مخرجات بعد"
            emptyMessage="لا مخرجات مسجلة لهذا المشروع بعد."
            onRetry={() => outputs.refetch()}
            refetch={outputs.refetch}
            isRefetching={outputs.isRefetching}
            onEndReached={outputs.onEndReached}
            isFetchingNextPage={outputs.isFetchingNextPage}
            hasNextPage={outputs.hasNextPage}
            loadMoreError={outputs.loadMoreError}
            onRetryLoadMore={outputs.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        </View>
      </View>
    </Screen>
  );
}
