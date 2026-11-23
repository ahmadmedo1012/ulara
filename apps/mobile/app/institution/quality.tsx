import { useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { Segmented } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useSelfAssessmentsPaged, useAccreditationsPaged } from "@/features/institutional/queries";
import type { InternalSelfAssessment, ExternalAccreditation } from "@/api/institutional";
import {
  SELF_ASSESSMENT_STATUS_LABELS, ACCREDITATION_TYPE_LABELS, ACCREDITATION_STATUS_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";

/* ── the two registers' rows — memoized at module scope ─────────── */

const SelfAssessmentRow = makeRow<InternalSelfAssessment>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.periodLabel}</T>
          <T variant="xs" color="muted" numberOfLines={2}>
            {item.orgUnit?.nameAr ?? "المؤسسة كاملة"}
            {item.criteriaSet ? ` · ${item.criteriaSet.nameAr} ${item.criteriaSet.version}` : ""}
            {item.summary ? ` · ${item.summary.slice(0, 60)}` : ""}
          </T>
        </View>
        <Badge label={labelOf(SELF_ASSESSMENT_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

const AccreditationRow = makeRow<ExternalAccreditation>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">
            {item.authority?.nameAr ?? "جهة اعتماد غير معروفة"}
            {" · "}
            {labelOf(ACCREDITATION_TYPE_LABELS, item.type)}
          </T>
          <T variant="xs" color="muted">
            {item.effectiveFrom ? item.effectiveFrom.slice(0, 10) : "—"}
            {" ← "}
            {item.effectiveTo ? item.effectiveTo.slice(0, 10) : "غير محدد"}
            {item.decisionNumber ? ` · قرار ${item.decisionNumber}` : ""}
          </T>
        </View>
        <Badge label={labelOf(ACCREDITATION_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/quality — the quality surface (web QualityPage parity,
 * read surface): the internal self-assessments (period · unit ·
 * status) and the external accreditations (authority · scope ·
 * window) — QUALITY's oversight seat. Both segments are fully-paged
 * DataLists (the pager follows the server's meta).
 */
export default function InstitutionQuality() {
  const [tab, setTab] = useState("self");

  const self = useSelfAssessmentsPaged();
  const accreditations = useAccreditationsPaged();

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="الجودة والاعتماد" kicker="التقييم الذاتي والاعتماد" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <Segmented
          options={[
            { id: "self", label: `التقييم الذاتي (${latn(self.meta?.total ?? self.items.length)})` },
            { id: "accreditations", label: `الاعتمادات (${latn(accreditations.meta?.total ?? accreditations.items.length)})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />
        <T variant="xs" color="faint">
          {tab === "self"
            ? `${latn(self.items.length)} معروضاً${self.meta && self.meta.total > self.items.length ? ` من ${latn(self.meta.total)} وفق سجل الجودة` : ""}`
            : `${latn(accreditations.items.length)} معروضاً${accreditations.meta && accreditations.meta.total > accreditations.items.length ? ` من ${latn(accreditations.meta.total)} وفق سجل الجودة` : ""}`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        {tab === "self" ? (
          <DataList
            data={self.items}
            renderItem={({ item }) => <SelfAssessmentRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={self.isLoading}
            isError={self.isError}
            emptyTitle="لا تقييمات ذاتية بعد"
            emptyMessage="التقييم الذاتي الداخلي لم يبدأ بعد — دورات التقييم تظهر هنا."
            onRetry={() => self.refetch()}
            refetch={self.refetch}
            isRefetching={self.isRefetching}
            onEndReached={self.onEndReached}
            isFetchingNextPage={self.isFetchingNextPage}
            hasNextPage={self.hasNextPage}
            loadMoreError={self.loadMoreError}
            onRetryLoadMore={self.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        ) : (
          <DataList
            data={accreditations.items}
            renderItem={({ item }) => <AccreditationRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={accreditations.isLoading}
            isError={accreditations.isError}
            emptyTitle="لا اعتمادات بعد"
            emptyMessage="لا اعتمادات خارجية مسجلة — المركز الوطني وغيره يظهر هنا."
            onRetry={() => accreditations.refetch()}
            refetch={accreditations.refetch}
            isRefetching={accreditations.isRefetching}
            onEndReached={accreditations.onEndReached}
            isFetchingNextPage={accreditations.isFetchingNextPage}
            hasNextPage={accreditations.hasNextPage}
            loadMoreError={accreditations.loadMoreError}
            onRetryLoadMore={accreditations.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        )}
      </View>
    </Screen>
  );
}
