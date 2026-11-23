import { useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { ChipGroup, Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import { usePlacementsPaged, useMyCapabilities, useUpdatePlacement } from "@/features/institutional/queries";
import type { TrainingPlacement } from "@/api/institutional";
import { PLACEMENT_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "PLANNED", label: PLACEMENT_STATUS_LABELS.PLANNED },
  { id: "ACTIVE", label: PLACEMENT_STATUS_LABELS.ACTIVE },
  { id: "COMPLETED", label: PLACEMENT_STATUS_LABELS.COMPLETED },
  { id: "CANCELLED", label: PLACEMENT_STATUS_LABELS.CANCELLED },
];

/**
 * The placement row (the training register's expandable row). Rows
 * with WRITE affordances re-render on `canEvaluate` changes — the
 * DataList's extraData carries it.
 */
function PlacementRow({ row, canEvaluate }: { row: TrainingPlacement; canEvaluate: boolean }) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(row.evaluationScore != null ? String(row.evaluationScore) : "");
  const [summary, setSummary] = useState(row.evaluationSummary ?? "");
  const update = useUpdatePlacement();

  const save = async () => {
    const parsed = score.trim() === "" ? undefined : Number(score.trim());
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
      toast.error("الدرجة بين 0 و 100 فقط.", "تقييم التدريب");
      return;
    }
    try {
      await update.mutateAsync({
        id: row.id,
        evaluationScore: parsed,
        evaluationSummary: summary.trim() || undefined,
      });
      toast.success("حُفظ تقييم الموقع.", "تقييم التدريب");
      setEditing(false);
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر حفظ التقييم");
    }
  };

  return (
    <LedgerRow style={{ backgroundColor: "transparent" }}>
      <View style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="medium">{row.learnerProfile?.fullNameAr ?? "متدرب غير مرتبط"}</T>
            <T variant="xs" color="muted">
              {row.hostOrgUnit?.nameAr ?? row.externalHost ?? "موقع خارجي"}
              {row.supervisorPerson ? ` · بإشراف ${row.supervisorPerson.fullNameAr}` : ""}
            </T>
            <T variant="xs" color="faint">
              {row.startsAt.slice(0, 10)} ← {row.endsAt ? row.endsAt.slice(0, 10) : "مستمر"}
            </T>
          </View>
          <Badge label={labelOf(PLACEMENT_STATUS_LABELS, row.status)} tone={toneOf(row.status)} />
        </View>

        {row.evaluationScore != null || row.evaluationSummary ? (
          <View style={{ gap: 2 }}>
            {row.evaluationScore != null ? (
              <T variant="sm" color="muted">التقييم: {latn(row.evaluationScore)} / 100</T>
            ) : null}
            {row.evaluationSummary ? (
              <T variant="xs" color="faint" numberOfLines={3}>{row.evaluationSummary}</T>
            ) : null}
          </View>
        ) : (
          <T variant="xs" color="faint">بلا تقييم بعد.</T>
        )}

        {canEvaluate ? (
          editing ? (
            <View style={{ gap: sp[8] }}>
              <Field
                label="الدرجة (0–100)"
                value={score}
                onChangeText={setScore}
                keyboardType="numeric"
                placeholder="مثال: 85"
              />
              <Field
                label="خلاصة التقييم"
                value={summary}
                onChangeText={setSummary}
                multiline
                placeholder="ما تم وإتقانه وما يحتاج متابعة…"
              />
              <View style={{ flexDirection: "row", gap: sp[8] }}>
                <Button label={update.isPending ? "جارٍ الحفظ…" : "حفظ التقييم"} disabled={update.isPending} onPress={save} />
                <Button label="إلغاء" kind="ghost" onPress={() => setEditing(false)} />
              </View>
            </View>
          ) : (
            <Button label="تقييم الموقع" kind="ghost" small onPress={() => setEditing(true)} />
          )
        ) : null}
      </View>
    </LedgerRow>
  );
}

/** Plain rows ride the memo factory; the evaluation row keeps its own
 *  component (per-row editor state). */
const PlacementReadRow = makeRow<TrainingPlacement>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="medium">{item.learnerProfile?.fullNameAr ?? "متدرب غير مرتبط"}</T>
            <T variant="xs" color="muted">
              {item.hostOrgUnit?.nameAr ?? item.externalHost ?? "موقع خارجي"}
              {item.supervisorPerson ? ` · بإشراف ${item.supervisorPerson.fullNameAr}` : ""}
            </T>
            <T variant="xs" color="faint">
              {item.startsAt.slice(0, 10)} ← {item.endsAt ? item.endsAt.slice(0, 10) : "مستمر"}
            </T>
          </View>
          <Badge label={labelOf(PLACEMENT_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
        </View>
        {item.evaluationScore != null || item.evaluationSummary ? (
          <View style={{ gap: 2 }}>
            {item.evaluationScore != null ? (
              <T variant="sm" color="muted">التقييم: {latn(item.evaluationScore)} / 100</T>
            ) : null}
            {item.evaluationSummary ? (
              <T variant="xs" color="faint" numberOfLines={3}>{item.evaluationSummary}</T>
            ) : null}
          </View>
        ) : (
          <T variant="xs" color="faint">بلا تقييم بعد.</T>
        )}
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/training — the training placements register (web
 * TrainingPage parity): each placement (learner · host · supervisor ·
 * window) with its evaluation state. The EVALUATION write (score +
 * summary on the placement record) is gated by the server's
 * PROGRAMS_MANAGE capability — the editor never renders without it.
 * DataList + usePagedList — every page reachable.
 */
export default function InstitutionTraining() {
  const [status, setStatus] = useState("");
  const placements = usePlacementsPaged({ status: status || undefined });
  const caps = useMyCapabilities();
  const canEvaluate = caps.data?.has("PROGRAMS_MANAGE") ?? false;

  const total = placements.meta?.total ?? placements.items.length;
  const activeCount = placements.items.filter((r) => r.status === "ACTIVE").length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="التدريب العملي" kicker="مواقع التدريب والتقييم" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        <T variant="xs" color="faint">
          {latn(placements.items.length)} معروضاً{total > placements.items.length ? ` من ${latn(total)} وفق سجل التدريب` : ""}
          {` · ${latn(activeCount)} جارٍ`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={placements.items}
          renderItem={({ item }) =>
            canEvaluate ? <PlacementRow row={item} canEvaluate /> : <PlacementReadRow item={item} />
          }
          keyExtractor={(row) => row.id}
          extraData={canEvaluate}
          isLoading={placements.isLoading}
          isError={placements.isError}
          emptyTitle="لا مواقع تدريب بعد"
          emptyMessage="سجل التدريب العملي فارغ لهذه المؤسسة."
          onRetry={() => placements.refetch()}
          refetch={placements.refetch}
          isRefetching={placements.isRefetching}
          onEndReached={placements.onEndReached}
          isFetchingNextPage={placements.isFetchingNextPage}
          hasNextPage={placements.hasNextPage}
          loadMoreError={placements.loadMoreError}
          onRetryLoadMore={placements.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
