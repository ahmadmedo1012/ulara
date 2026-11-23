import { useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { Segmented } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useLicensesPaged, useInspectionsPaged, useFindingsPaged } from "@/features/institutional/queries";
import type { OperationalLicense, RegulatoryInspection, ComplianceFinding } from "@/api/institutional";
import {
  LICENSE_KIND_LABELS, LICENSE_STATUS_LABELS, INSPECTION_KIND_LABELS, INSPECTION_STATUS_LABELS,
  FINDING_SEVERITY_LABELS, FINDING_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/* ── the three registers' rows — memoized at module scope ────────── */

const LicenseRow = makeRow<OperationalLicense>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">
            {labelOf(LICENSE_KIND_LABELS, item.kind)}
            {item.licenseNumber ? ` · ${item.licenseNumber}` : ""}
          </T>
          <T variant="xs" color="muted">
            {item.authority?.nameAr ?? "—"}
            {item.expiresAt ? ` · ينتهي ${item.expiresAt.slice(0, 10)}` : ""}
          </T>
        </View>
        <Badge label={labelOf(LICENSE_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

const InspectionRow = makeRow<RegulatoryInspection>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{labelOf(INSPECTION_KIND_LABELS, item.kind)}</T>
          <T variant="xs" color="muted">
            {item.authority?.nameAr ?? "—"}
            {item.scheduledAt ? ` · ${item.scheduledAt.slice(0, 10)}` : ""}
            {item.conductedAt ? ` (أُجري ${item.conductedAt.slice(0, 10)})` : ""}
            {typeof item.findingCount === "number" ? ` · ${item.findingCount} ملاحظة` : ""}
          </T>
        </View>
        <Badge label={labelOf(INSPECTION_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

const FindingRow = makeRow<ComplianceFinding>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.titleAr}</T>
          <T variant="xs" color="muted">
            {labelOf(FINDING_SEVERITY_LABELS, item.severity)}
            {item.dueDate ? ` · معالجة قبل ${item.dueDate.slice(0, 10)}` : ""}
          </T>
        </View>
        <Badge label={labelOf(FINDING_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/licenses — the compliance surface (web LicensesPage
 * parity, read surface): operational licenses, the regulatory
 * inspections, and the findings with severity — three registers in
 * one segmented surface, each its own fully-paged DataList.
 */
export default function InstitutionLicenses() {
  const [tab, setTab] = useState("licenses");

  const licenses = useLicensesPaged();
  const inspections = useInspectionsPaged();
  const findings = useFindingsPaged();

  /* the open count is honest about its window: among the rows loaded
   * so far (the server totals everything, not the open subset). */
  const openFindings = findings.items.filter((f) => f.status !== "RESOLVED" && f.status !== "CLOSED").length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="التراخيص والتفتيش" kicker="سجل الامتثال" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <Segmented
          options={[
            { id: "licenses", label: `التراخيص (${latn(licenses.meta?.total ?? licenses.items.length)})` },
            { id: "inspections", label: `التفتيش (${latn(inspections.meta?.total ?? inspections.items.length)})` },
            { id: "findings", label: `الملاحظات (${latn(findings.meta?.total ?? findings.items.length)})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />
        {tab === "findings" && findings.items.length > 0 ? (
          <StatLine
            label="الملاحظات المفتوحة"
            value={latn(openFindings)}
            tone="danger"
            hint={`من ${latn(findings.items.length)} ملاحظة محمّلة — غير معالجة أو مغلقة`}
          />
        ) : null}
        <T variant="xs" color="faint">
          {tab === "licenses"
            ? `${latn(licenses.items.length)} معروضاً${licenses.meta && licenses.meta.total > licenses.items.length ? ` من ${latn(licenses.meta.total)} وفق سجل الامتثال` : ""}`
            : tab === "inspections"
              ? `${latn(inspections.items.length)} معروضاً${inspections.meta && inspections.meta.total > inspections.items.length ? ` من ${latn(inspections.meta.total)} وفق سجل الامتثال` : ""}`
              : `${latn(findings.items.length)} معروضاً${findings.meta && findings.meta.total > findings.items.length ? ` من ${latn(findings.meta.total)} وفق سجل الامتثال` : ""}`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        {tab === "licenses" ? (
          <DataList
            data={licenses.items}
            renderItem={({ item }) => <LicenseRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={licenses.isLoading}
            isError={licenses.isError}
            emptyTitle="لا تراخيص بعد"
            emptyMessage="لا تراخيص تشغيل مسجلة — التراخيص الفنية وقرارات الإنشاء تظهر هنا."
            onRetry={() => licenses.refetch()}
            refetch={licenses.refetch}
            isRefetching={licenses.isRefetching}
            onEndReached={licenses.onEndReached}
            isFetchingNextPage={licenses.isFetchingNextPage}
            hasNextPage={licenses.hasNextPage}
            loadMoreError={licenses.loadMoreError}
            onRetryLoadMore={licenses.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        ) : tab === "inspections" ? (
          <DataList
            data={inspections.items}
            renderItem={({ item }) => <InspectionRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={inspections.isLoading}
            isError={inspections.isError}
            emptyTitle="لا تفتيشات بعد"
            emptyMessage="لا زيارات تفتيش رقابية مسجلة بعد."
            onRetry={() => inspections.refetch()}
            refetch={inspections.refetch}
            isRefetching={inspections.isRefetching}
            onEndReached={inspections.onEndReached}
            isFetchingNextPage={inspections.isFetchingNextPage}
            hasNextPage={inspections.hasNextPage}
            loadMoreError={inspections.loadMoreError}
            onRetryLoadMore={inspections.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        ) : (
          <DataList
            data={findings.items}
            renderItem={({ item }) => <FindingRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={findings.isLoading}
            isError={findings.isError}
            emptyTitle="لا ملاحظات بعد"
            emptyMessage="لا ملاحظات تفتيش أو اعتماد مسجلة — الجسيمة والحرجة تظهر بلون الخطر."
            onRetry={() => findings.refetch()}
            refetch={findings.refetch}
            isRefetching={findings.isRefetching}
            onEndReached={findings.onEndReached}
            isFetchingNextPage={findings.isFetchingNextPage}
            hasNextPage={findings.hasNextPage}
            loadMoreError={findings.loadMoreError}
            onRetryLoadMore={findings.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        )}
      </View>
    </Screen>
  );
}
