import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useMyInstitutionProfile, useMyCapabilities } from "@/features/institutional/queries";
import {
  SECTOR_LABELS, OWNERSHIP_LABELS, INSTITUTION_STATUS_LABELS,
  labelOf, toneOf,
} from "@/features/institutional/labels";
import { visibleSections, INST_SECTIONS } from "@/features/institutional/sections";

/**
 * /institution — the workspace overview (web OverviewPage parity):
 * the institution's own classification masthead (kind · sector ·
 * ownership · status, the establishment decision) + the statutory
 * sections, kind-aware (research hides for the intermediate-institute
 * and vocational-center kinds — Law 21/2023 stages 1–2 carry no
 * research mandate, LEGAL-MATRIX.md §A.3). Every section row carries
 * the caller's effective capability mark (the server's word — never
 * role-name inference): «إدارة» when the manage capability is held,
 * «قراءة» for member-level reads. The page scrolls (Screen scroll)
 * — the whole section register is reachable on small screens.
 */
export default function InstitutionOverview() {
  const p = usePalette();
  const profile = useMyInstitutionProfile();
  const caps = useMyCapabilities();

  const inst = profile.data ?? null;
  const kind = inst?.kind?.code ?? null;
  const sections = visibleSections(kind);
  const has = (cap: string) => caps.data?.has(cap) ?? false;

  return (
    <Screen scroll padded={false}>
      <StackHeader title="مساحة العمل المؤسسية" kicker={inst?.name ?? "المؤسسة التعليمية"} />
      <View style={{ gap: sp[16], padding: sp[16] }}>
        {/* the classification masthead — the institution's own words */}
        {profile.isLoading ? (
          <SkeletonList rows={4} />
        ) : profile.isError ? (
          <ErrorState
            message="تعذّر تحميل بيانات المؤسسة."
            onRetry={() => profile.refetch()}
          />
        ) : inst ? (
          <View style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
              <T variant="h3" weight="bold">{inst.name}</T>
              <Badge label={labelOf(INSTITUTION_STATUS_LABELS, inst.status)} tone={toneOf(inst.status)} />
            </View>
            {inst.kind ? (
              <T variant="sm" color="muted">{inst.kind.nameAr}</T>
            ) : null}
            {inst.sector ? (
              <T variant="sm" color="muted">{labelOf(SECTOR_LABELS, inst.sector)}</T>
            ) : null}
            {inst.ownership ? (
              <T variant="xs" color="faint">الملكية: {labelOf(OWNERSHIP_LABELS, inst.ownership)}</T>
            ) : null}
            {inst.establishmentDecisionNumber ? (
              <T variant="xs" color="faint">
                قرار الإنشاء: {inst.establishmentDecisionNumber}
                {inst.establishmentDecisionDate ? ` · ${inst.establishmentDecisionDate}` : ""}
              </T>
            ) : null}
            {inst.supervisingAuthority ? (
              <T variant="xs" color="faint">جهة الإشراف: {inst.supervisingAuthority.nameAr}</T>
            ) : null}
          </View>
        ) : (
          <T variant="sm" color="muted">لا يوجد سياق مؤسسة في هذه الجلسة.</T>
        )}

        {/* the caller's effective capability count — the server's word */}
        <StatLine
          label="قدراتك الفعلية في المؤسسة"
          value={caps.data ? `${caps.data.capabilities.length}` : "…"}
          hint="من 11 قدرة مؤسسية — الخادم يحسمها من عضويتك ومنحك"
        />

        {/* the statutory sections — kind-aware, capability-marked */}
        <T variant="h4" weight="bold">الأقسام النظامية</T>
        <RowList>
          {sections.map((s, i) => (
            <LedgerRow
              key={s.to}
              last={i === sections.length - 1}
              accessibilityLabel={s.label}
              onPress={() => router.push(s.to as never)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: p.surface,
                    borderWidth: 1,
                    borderColor: p.border,
                  }}
                >
                  <s.icon size={18} color={p.text} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body" weight="medium">{s.label}</T>
                  <T variant="xs" color="muted">{s.desc}</T>
                </View>
                {s.manage && has(s.manage) ? (
                  <Badge label="إدارة" tone="mint" />
                ) : (
                  <Badge label="قراءة" tone="grey" />
                )}
              </View>
            </LedgerRow>
          ))}
        </RowList>

        <T variant="xs" color="faint">
          {INST_SECTIONS.length} قسماً نظامياً — القسم المخفي لنوع مؤسستك لا يظهر هنا.
        </T>
      </View>
    </Screen>
  );
}
