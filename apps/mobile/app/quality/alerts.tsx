
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { humanizeError } from "@/lib/errors";
import { useQuery } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Segmented } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn } from "@/lib/format";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";
import {
  SeverityChip,
  alertCategoryLabel,
  numOf,
  type QualityAlertsPayload,
} from "@/features/governance/components";

/**
 * Pushed: /quality/alerts — the quality bell target: BOTH boards in one
 * screen (Segmented «عملياتي/البريد»): the operational alert board
 * (qualityApi.alerts) and the personal inbox (NotificationsScreen,
 * `embedded` — this shell owns the header, back and insets).
 *
 * The Segmented stays MOUNTED across both branches (the retired shape
 * unmounted it with the board — «البريد» could never show as selected and
 * there was no in-screen way back).
 */
export default function QualityAlerts() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"board" | "inbox">("board");

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <StackHeader title="تنبيهات الجودة" kicker="قطاع ضمان الجودة" />
      <View style={{ paddingHorizontal: sp[20], paddingVertical: sp[12] }}>
        <Segmented
          options={[
            { id: "board", label: "عملياتي" },
            { id: "inbox", label: "البريد" },
          ]}
          selectedId={tab}
          onSelect={(id) => setTab(id as "board" | "inbox")}
        />
      </View>
      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
        {tab === "inbox" ? <NotificationsScreen embedded /> : <BoardBranch />}
      </View>
    </View>
  );
}

function BoardBranch() {
  const scope = useInstitutionScope();
  const alerts = useQuery({
    queryKey: ["quality", "alerts", scope],
    queryFn: async () => (await qualityApi.alerts()) as QualityAlertsPayload | QualityAlertsPayload["alerts"],
    staleTime: 60_000,
  });

  const payload: QualityAlertsPayload = Array.isArray(alerts.data)
    ? { alerts: alerts.data, counts: null }
    : ((alerts.data as QualityAlertsPayload) ?? {});
  const rows = payload.alerts ?? [];
  const critical = numOf(payload.counts?.critical) ?? rows.filter((a) => a.severity === "critical").length;
  const warning = numOf(payload.counts?.warning) ?? rows.filter((a) => a.severity === "warning").length;
  const info = numOf(payload.counts?.info) ?? rows.filter((a) => a.severity === "info").length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: sp[20],
        paddingTop: sp[16],
        paddingBottom: sp[24],
        gap: sp[16],
      }}
    >
      {alerts.isLoading ? (
        <SkeletonList rows={4} />
      ) : alerts.isError ? (
        <ErrorState message={humanizeError(alerts.error)} onRetry={() => alerts.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا توجد تنبيهات حالياً"
          message="كلّ المؤشّرات ضمن النطاق الطبيعيّ."
        />
      ) : (
        <>
          <RowList>
            <LedgerRow last>
              <StatLine label="تنبيهات حرجة" value={latn(critical)} hint="تستوجب قرارًا" />
              <StatLine label="تحذيرات" value={latn(warning)} hint="تحتاج متابعة" />
              <StatLine label="معلومات" value={latn(info)} hint="للمتابعة فقط" />
            </LedgerRow>
          </RowList>

          <RowList>
            {rows.map((a, i) => (
              <LedgerRow key={a.id} last={i === rows.length - 1}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <SeverityChip severity={a.severity} />
                  <Badge label={alertCategoryLabel(a.category)} tone="grey" />
                  <T variant="xs" color="faint">
                    {fromNow(a.occurredAt)}
                  </T>
                </View>
                <T variant="body" weight="bold">
                  {a.title ?? "—"}
                </T>
                {a.description ? (
                  <T variant="sm" color="muted">
                    {a.description}
                  </T>
                ) : null}
              </LedgerRow>
            ))}
          </RowList>
          {rows.length >= 20 ? (
            <T variant="xs" color="faint">
              تُعرض أول {latn(20)} تنبيهًا — حدّ الخادم لهذا اللوح.
            </T>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

