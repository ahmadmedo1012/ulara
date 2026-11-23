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
import { useLicenses, useInspections, useFindings } from "@/features/institutional/queries";
import {
  LICENSE_KIND_LABELS, LICENSE_STATUS_LABELS, INSPECTION_KIND_LABELS, INSPECTION_STATUS_LABELS,
  FINDING_SEVERITY_LABELS, FINDING_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/licenses — the compliance surface (web LicensesPage
 * parity, read surface): operational licenses, the regulatory
 * inspections, and the findings with severity — three registers in
 * one segmented surface, honest empty states throughout.
 */
export default function InstitutionLicenses() {
  const p = usePalette();
  const [tab, setTab] = useState("licenses");

  const licenses = useLicenses({ limit: 50 });
  const inspections = useInspections({ limit: 50 });
  const findings = useFindings({ limit: 50 });

  const licRows = Array.isArray(licenses.data) ? licenses.data : licenses.data?.data ?? [];
  const inspRows = Array.isArray(inspections.data) ? inspections.data : inspections.data?.data ?? [];
  const findRows = Array.isArray(findings.data) ? findings.data : findings.data?.data ?? [];

  const list = tab === "licenses" ? licenses : tab === "inspections" ? inspections : findings;
  const rows = tab === "licenses" ? licRows : tab === "inspections" ? inspRows : findRows;
  const emptyCopy =
    tab === "licenses"
      ? { title: "لا تراخيص بعد", message: "لا تراخيص تشغيل مسجلة — التراخيص الفنية وقرارات الإنشاء تظهر هنا." }
      : tab === "inspections"
        ? { title: "لا تفتيشات بعد", message: "لا زيارات تفتيش رقابية مسجلة بعد." }
        : { title: "لا ملاحظات بعد", message: "لا ملاحظات تفتيش أو اعتماد مسجلة — الجسيمة والحرجة تظهر بلون الخطر." };

  const openFindings = findRows.filter((f) => f.status !== "RESOLVED" && f.status !== "CLOSED").length;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="التراخيص والتفتيش" kicker="سجل الامتثال" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <Segmented
          options={[
            { id: "licenses", label: `التراخيص (${licRows.length})` },
            { id: "inspections", label: `التفتيش (${inspRows.length})` },
            { id: "findings", label: `الملاحظات (${findRows.length})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />

        {tab === "findings" && rows.length > 0 ? (
          <StatLine label="الملاحظات المفتوحة" value={`${openFindings}`} tone="danger" hint="غير معالجة أو مغلقة" />
        ) : null}

        {list.isLoading ? (
          <SkeletonList rows={6} />
        ) : list.isError ? (
          <ErrorState message="تعذّر تحميل سجل الامتثال." onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
        ) : (
          <RowList>
            {tab === "licenses" &&
              licRows.map((l, i) => (
                <LedgerRow key={l.id} last={i === licRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">
                        {labelOf(LICENSE_KIND_LABELS, l.kind)}
                        {l.licenseNumber ? ` · ${l.licenseNumber}` : ""}
                      </T>
                      <T variant="xs" color="muted">
                        {l.authority?.nameAr ?? "—"}
                        {l.expiresAt ? ` · ينتهي ${l.expiresAt.slice(0, 10)}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(LICENSE_STATUS_LABELS, l.status)} tone={toneOf(l.status)} />
                  </View>
                </LedgerRow>
              ))}
            {tab === "inspections" &&
              inspRows.map((it, i) => (
                <LedgerRow key={it.id} last={i === inspRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{labelOf(INSPECTION_KIND_LABELS, it.kind)}</T>
                      <T variant="xs" color="muted">
                        {it.authority?.nameAr ?? "—"}
                        {it.scheduledAt ? ` · ${it.scheduledAt.slice(0, 10)}` : ""}
                        {it.conductedAt ? ` (أُجري ${it.conductedAt.slice(0, 10)})` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(INSPECTION_STATUS_LABELS, it.status)} tone={toneOf(it.status)} />
                  </View>
                </LedgerRow>
              ))}
            {tab === "findings" &&
              findRows.map((f, i) => (
                <LedgerRow key={f.id} last={i === findRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{f.titleAr}</T>
                      <T variant="xs" color="muted">
                        {labelOf(FINDING_SEVERITY_LABELS, f.severity)}
                        {f.dueDate ? ` · معالجة قبل ${f.dueDate.slice(0, 10)}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(FINDING_STATUS_LABELS, f.status)} tone={toneOf(f.status)} />
                  </View>
                </LedgerRow>
              ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
