import { useState } from "react";
import { View } from "react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useSelfAssessments, useAccreditations } from "@/features/institutional/queries";
import {
  SELF_ASSESSMENT_STATUS_LABELS, ACCREDITATION_TYPE_LABELS, ACCREDITATION_STATUS_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/quality — the quality surface (web QualityPage parity,
 * read surface): the internal self-assessments (period · unit ·
 * status) and the external accreditations (authority · scope ·
 * window) — QUALITY's oversight seat with honest empty states.
 */
export default function InstitutionQuality() {
  const p = usePalette();
  const [tab, setTab] = useState("self");

  const self = useSelfAssessments({ limit: 50 });
  const accreditations = useAccreditations({ limit: 50 });

  const selfRows = Array.isArray(self.data) ? self.data : self.data?.data ?? [];
  const accRows = Array.isArray(accreditations.data) ? accreditations.data : accreditations.data?.data ?? [];

  const list = tab === "self" ? self : accreditations;
  const rows = tab === "self" ? selfRows : accRows;
  const emptyCopy =
    tab === "self"
      ? { title: "لا تقييمات ذاتية بعد", message: "التقييم الذاتي الداخلي لم يبدأ بعد — دورات التقييم تظهر هنا." }
      : { title: "لا اعتمادات بعد", message: "لا اعتمادات خارجية مسجلة — المركز الوطني وغيره يظهر هنا." };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="الجودة والاعتماد" kicker="التقييم الذاتي والاعتماد" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <Segmented
          options={[
            { id: "self", label: `التقييم الذاتي (${selfRows.length})` },
            { id: "accreditations", label: `الاعتمادات (${accRows.length})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />

        {list.isLoading ? (
          <SkeletonList rows={6} />
        ) : list.isError ? (
          <ErrorState message="تعذّر تحميل بيانات الجودة." onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
        ) : tab === "self" ? (
          <>
            <StatLine
              label="الدورات المعروضة"
              value={`${selfRows.length}`}
              hint={`${selfRows.filter((s) => s.status === "APPROVED").length} معتمدة`}
            />
            <RowList>
              {selfRows.map((s, i) => (
                <LedgerRow key={s.id} last={i === selfRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{s.periodLabel}</T>
                      <T variant="xs" color="muted">
                        {s.orgUnit?.nameAr ?? "المؤسسة كاملة"}
                        {s.summary ? ` · ${s.summary.slice(0, 60)}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(SELF_ASSESSMENT_STATUS_LABELS, s.status)} tone={toneOf(s.status)} />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </>
        ) : (
          <RowList>
            {accRows.map((a, i) => (
              <LedgerRow key={a.id} last={i === accRows.length - 1}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">
                      {a.authority?.nameAr ?? "جهة اعتماد غير معروفة"}
                      {" · "}
                      {labelOf(ACCREDITATION_TYPE_LABELS, a.type)}
                    </T>
                    <T variant="xs" color="muted">
                      {a.effectiveFrom ? a.effectiveFrom.slice(0, 10) : "—"}
                      {" ← "}
                      {a.effectiveTo ? a.effectiveTo.slice(0, 10) : "غير محدد"}
                      {a.decisionNumber ? ` · قرار ${a.decisionNumber}` : ""}
                    </T>
                  </View>
                  <Badge label={labelOf(ACCREDITATION_STATUS_LABELS, a.status)} tone={toneOf(a.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
