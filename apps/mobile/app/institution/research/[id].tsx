import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useResearchProject, useResearchOutputs } from "@/features/institutional/queries";
import {
  RESEARCH_STATUS_LABELS, RESEARCH_MEMBER_ROLE_LABELS, RESEARCH_OUTPUT_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/research/[id] — the project record (web
 * ResearchDetailPage parity, read surface): the research team (with
 * roles + allocation) and the project's outputs (publications,
 * patents, prototypes).
 */
export default function InstitutionResearchDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const project = useResearchProject(id || null);
  const outputs = useResearchOutputs({ projectId: id || undefined, limit: 50 });

  const data = project.data ?? null;
  const outputRows = Array.isArray(outputs.data) ? outputs.data : outputs.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title={data?.titleAr ?? "سجل المشروع"} kicker="البحث المؤسسي" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        {project.isLoading ? (
          <SkeletonList rows={5} />
        ) : project.isError ? (
          <ErrorState message="تعذّر تحميل سجل المشروع." onRetry={() => project.refetch()} />
        ) : !data ? (
          <EmptyState title="لا يوجد المشروع" message="هذا المشروع البحثي غير موجود في هذه المؤسسة." />
        ) : (
          <>
            <View style={{ gap: sp[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold" style={{ flex: 1 }}>{data.titleAr}</T>
                <Badge label={labelOf(RESEARCH_STATUS_LABELS, data.status)} tone={toneOf(data.status)} />
              </View>
              {data.field ? <T variant="sm" color="muted">{data.field}</T> : null}
              {data.code ? <T variant="xs" color="faint">الرمز: {data.code}</T> : null}
              {data.fundingSource ? <T variant="xs" color="faint">مصدر التمويل: {data.fundingSource}</T> : null}
              {data.ethicsApprovalRef ? <T variant="xs" color="faint">موافقة أخلاقيات: {data.ethicsApprovalRef}</T> : null}
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
              <RowList>
                {(data.members ?? []).map((m, i, arr) => (
                  <LedgerRow key={m.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{m.person?.displayName ?? "غير مرتبط"}</T>
                        <T variant="xs" color="muted">
                          {labelOf(RESEARCH_MEMBER_ROLE_LABELS, m.role)}
                          {m.allocationPct != null ? ` · ${m.allocationPct}% تفرّغ` : ""}
                        </T>
                      </View>
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}

            <T variant="h4" weight="bold">المخرجات</T>
            {outputs.isLoading ? (
              <SkeletonList rows={3} />
            ) : outputs.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل مخرجات المشروع.</T>
            ) : outputRows.length === 0 ? (
              <T variant="sm" color="muted">لا مخرجات مسجلة لهذا المشروع بعد.</T>
            ) : (
              <RowList>
                {outputRows.map((o, i) => (
                  <LedgerRow key={o.id} last={i === outputRows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{o.title}</T>
                        <T variant="xs" color="muted">
                          {labelOf(RESEARCH_OUTPUT_LABELS, o.type)}
                          {o.publishedAt ? ` · ${o.publishedAt.slice(0, 10)}` : ""}
                          {o.doi ? ` · DOI ${o.doi}` : ""}
                        </T>
                      </View>
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
