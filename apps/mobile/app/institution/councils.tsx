import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { ChipGroup } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useCouncils } from "@/features/institutional/queries";
import { COUNCIL_TYPE_LABELS, COUNCIL_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

const STATUS_CHIPS = [
  { id: "", label: "الكل" },
  { id: "ACTIVE", label: COUNCIL_STATUS_LABELS.ACTIVE },
  { id: "DISSOLVED", label: COUNCIL_STATUS_LABELS.DISSOLVED },
  { id: "CANCELLED", label: COUNCIL_STATUS_LABELS.CANCELLED },
];

/**
 * /institution/councils — the councils register (web CouncilsPage
 * parity, read surface): councils and standing committees with their
 * type/status; tapping opens the council's own record (members +
 * meetings + documents).
 */
export default function InstitutionCouncils() {
  const p = usePalette();
  const [status, setStatus] = useState("");
  const councils = useCouncils({ status: status || undefined, limit: 50 });

  const rows = Array.isArray(councils.data) ? councils.data : councils.data?.data ?? [];
  const activeCount = rows.filter((c) => c.status === "ACTIVE").length;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="المجالس واللجان" kicker="سجل الحوكمة" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <ChipGroup options={STATUS_CHIPS} selectedId={status} onSelect={setStatus} />
        {rows.length > 0 ? (
          <StatLine label="المجالس المعروضة" value={`${rows.length}`} hint={`${activeCount} قائمة`} />
        ) : null}
        {councils.isLoading ? (
          <SkeletonList rows={8} />
        ) : councils.isError ? (
          <ErrorState message="تعذّر تحميل المجالس." onRetry={() => councils.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا مجالس بعد" message="لم تُشكَّل مجالس أو لجان لهذه المؤسسة بعد — مجلس الجامعة، مجالس الكليات، اللجان الدائمة." />
        ) : (
          <RowList>
            {rows.map((c, i) => (
              <LedgerRow
                key={c.id}
                last={i === rows.length - 1}
                accessibilityLabel={c.nameAr}
                onPress={() => router.push(`/institution/councils/${c.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{c.nameAr}</T>
                    <T variant="xs" color="muted">
                      {labelOf(COUNCIL_TYPE_LABELS, c.type)}
                      {typeof c.memberCount === "number" ? ` · ${c.memberCount} عضواً` : ""}
                      {" · "}
                      {c.formedAt.slice(0, 4)}
                    </T>
                  </View>
                  <Badge label={labelOf(COUNCIL_STATUS_LABELS, c.status)} tone={toneOf(c.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
