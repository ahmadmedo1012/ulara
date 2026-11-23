import { useState } from "react";
import { View } from "react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { ChipGroup, Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import { usePlacements, useMyCapabilities, useUpdatePlacement } from "@/features/institutional/queries";
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
 * /institution/training — the training placements register (web
 * TrainingPage parity): each placement (learner · host · supervisor ·
 * window) with its evaluation state. The EVALUATION write (score +
 * summary on the placement record) is gated by the server's
 * PROGRAMS_MANAGE capability — the editor never renders without it.
 */
export default function InstitutionTraining() {
  const p = usePalette();
  const [status, setStatus] = useState("");
  const placements = usePlacements({ status: status || undefined, limit: 50 });
  const caps = useMyCapabilities();
  const canEvaluate = caps.data?.has("PROGRAMS_MANAGE") ?? false;

  const rows = Array.isArray(placements.data) ? placements.data : placements.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="التدريب العملي" kicker="مواقع التدريب والتقييم" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        {rows.length > 0 ? (
          <StatLine
            label="مواقع التدريب المعروضة"
            value={`${rows.length}`}
            hint={`${rows.filter((r) => r.status === "ACTIVE").length} جارٍ`}
          />
        ) : null}
        {placements.isLoading ? (
          <SkeletonList rows={6} />
        ) : placements.isError ? (
          <ErrorState message="تعذّر تحميل مواقع التدريب." onRetry={() => placements.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا مواقع تدريب بعد" message="سجل التدريب العملي فارغ لهذه المؤسسة." />
        ) : (
          <RowList>
            {rows.map((row, i) => (
              <PlacementRow key={row.id} row={row} last={i === rows.length - 1} canEvaluate={canEvaluate} />
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}

function PlacementRow({ row, last, canEvaluate }: { row: TrainingPlacement; last: boolean; canEvaluate: boolean }) {
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
    <LedgerRow last={last}>
      <View style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="medium">{row.learnerProfile?.displayName ?? "متدرب غير مرتبط"}</T>
            <T variant="xs" color="muted">
              {row.hostOrgUnit?.nameAr ?? row.externalHost ?? "موقع خارجي"}
              {row.supervisor ? ` · بإشراف ${row.supervisor.displayName}` : ""}
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
