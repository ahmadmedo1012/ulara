import { useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import { useOrgUnitTree } from "@/features/institutional/queries";
import type { OrgUnitTreeNode } from "@/api/institutional";
import { ORG_UNIT_TYPE_LABELS, ORG_UNIT_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

/** A tree node row: the unit's kind + status, recursive children. */
function UnitNode({ node, depth }: { node: OrgUnitTreeNode; depth: number }) {
  const p = usePalette();
  const [open, setOpen] = useState(depth < 1);
  const childCount = node.children.length;
  return (
    <View>
      <LedgerRow
        accessibilityLabel={node.nameAr}
        last={childCount === 0}
        onPress={childCount > 0 ? () => setOpen((v) => !v) : undefined}
        style={{ paddingStart: sp[16] + depth * sp[16] }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="medium">{node.nameAr}</T>
            <T variant="xs" color="muted">
              {labelOf(ORG_UNIT_TYPE_LABELS, node.type)}
              {node.code ? ` · ${node.code}` : ""}
              {node.location ? ` · ${node.location}` : ""}
            </T>
          </View>
          {childCount > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
              <T variant="xs" color="faint">{childCount}</T>
              {open ? (
                <ChevronDown size={14} color={p.textMuted} />
              ) : (
                <ChevronLeft size={14} color={p.textMuted} />
              )}
            </View>
          ) : null}
          <Badge label={labelOf(ORG_UNIT_STATUS_LABELS, node.status)} tone={toneOf(node.status)} />
        </View>
      </LedgerRow>
      {open
        ? node.children.map((c) => <UnitNode key={c.id} node={c} depth={depth + 1} />)
        : null}
    </View>
  );
}

/**
 * /institution/organization — the org tree (web OrganizationPage
 * parity, read surface): the real hierarchy from GET
 * /institutional/org-units/tree (the wire's nested { unit, children }
 * shape unwrapped at the api seam) — colleges → scientific
 * departments → labs/offices. The whole tree scrolls (Screen scroll —
 * one scroller; every unit reachable however deep the tree), collapse
 * state is local, the first level renders expanded.
 */
export default function InstitutionOrganization() {
  const tree = useOrgUnitTree();

  const nodes = tree.data ?? [];
  const flatCount = (ns: readonly OrgUnitTreeNode[]): number =>
    ns.reduce((n, x) => n + 1 + flatCount(x.children), 0);

  return (
    <Screen scroll padded={false}>
      <StackHeader title="الهيكل التنظيمي" kicker="شجرة الوحدات" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {tree.isLoading ? (
          <SkeletonList rows={8} />
        ) : tree.isError ? (
          <ErrorState message="تعذّر تحميل شجرة الوحدات." onRetry={() => tree.refetch()} />
        ) : nodes.length === 0 ? (
          <EmptyState title="لا وحدات بعد" message="لم تُبنَ وحدات هذه المؤسسة بعد — كلّية، قسم، معمل، أو مكتب." />
        ) : (
          <>
            <T variant="xs" color="faint">
              {latn(flatCount(nodes))} وحدة في الشجرة — الأسهم تفتح المستويات.
            </T>
            <RowList>
              {nodes.map((n) => (
                <UnitNode key={n.id} node={n} depth={0} />
              ))}
            </RowList>
          </>
        )}
      </View>
    </Screen>
  );
}
