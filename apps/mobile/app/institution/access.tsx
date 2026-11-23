import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { SearchBar, SelectField } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import type { AdminUserRow } from "@/api/admin";
import {
  useMyCapabilities, useMyUnitCapabilities, useUserUnitCapabilities,
  useGrantUnitCapability, useRevokeUnitCapability, useOrgUnitTree, useUserSearch,
} from "@/features/institutional/queries";
import type { OrgUnitTreeNode } from "@/api/institutional";
import {
  CAPABILITY_LABELS, ORG_UNIT_TYPE_LABELS, PLATFORM_ROLE_LABELS,
  labelOf,
} from "@/features/institutional/labels";

/** Flatten the org tree to unit picker options. */
function unitOptionsOf(nodes: readonly OrgUnitTreeNode[]): { id: string; label: string; sub?: string }[] {
  const out: { id: string; label: string; sub?: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: n.nameAr, sub: labelOf(ORG_UNIT_TYPE_LABELS, n.type) });
    out.push(...unitOptionsOf(n.children));
  }
  return out;
}

/**
 * /institution/access — the capability surface (web AccessPage
 * parity): the caller's OWN effective set (the server's word — the
 * screen never decides authorization), their scoped unit-capability
 * grants, and — gated by UNIT_CAPABILITIES_ASSIGN — the per-user
 * grant/revoke management (search a user → grant ONE capability
 * scoped to a unit subtree or the institution → revoke with a
 * reason). This is the «الصلاحيات والمنح وسحبها» the platform
 * contract §12 defines: single-capability rows, never role bundles.
 *
 * R353-2 §5 (institution isolation) — the user search key carries
 * the scope, AND the whole search/selection state (query, applied
 * query, the selected user, the capability/unit/reason picks) RESETS
 * when the scope changes: a target chosen under institution A must
 * never surface under institution B's management surface.
 */
export default function InstitutionAccess() {
  const scope = useInstitutionScope();
  const myId = useSession((s) => s.user?.id) ?? null;

  const caps = useMyCapabilities();
  const myGrants = useMyUnitCapabilities();

  const canAssign = caps.data?.has("UNIT_CAPABILITIES_ASSIGN") ?? false;

  /* ── the per-user management surface (gated) ─────────────────────── */
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [capability, setCapability] = useState<{ id: string; label: string } | null>(null);
  const [orgUnit, setOrgUnit] = useState<{ id: string; label: string; sub?: string } | null>(null);
  const [reason, setReason] = useState("");

  /* §5: the scope segment changed → the search/selection state dies
   * with the old context (a picked user or a pending grant belongs to
   * the institution it was made under). */
  const scopeRef = useRef(scope);
  useEffect(() => {
    if (scopeRef.current !== scope) {
      scopeRef.current = scope;
      setQ("");
      setAppliedQ("");
      setSelectedUser(null);
      setCapability(null);
      setOrgUnit(null);
      setReason("");
    }
  }, [scope]);

  /* the house debounce for the user search. */
  const appliedRef = useRef(appliedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedRef.current) return;
      appliedRef.current = next;
      setAppliedQ(next);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const users = useUserSearch(appliedQ, canAssign);
  const targetGrants = useUserUnitCapabilities(selectedUser?.id ?? null);

  const tree = useOrgUnitTree();
  const unitOptions = unitOptionsOf(tree.data ?? []);

  const grant = useGrantUnitCapability(selectedUser?.id ?? "");
  const revoke = useRevokeUnitCapability();

  const capOptions = Object.entries(CAPABILITY_LABELS).map(([id, label]) => ({ id, label }));

  const onGrant = async () => {
    if (!selectedUser || !capability) return;
    try {
      await grant.mutateAsync({
        capability: capability.id,
        orgUnitId: orgUnit?.id,
        reason: reason.trim() || undefined,
      });
      toast.success(
        `مُنحت «${capability.label}»${orgUnit ? ` على ${orgUnit.label} (نطاق الوحدة)` : " على المؤسسة كاملة"}.`,
        "منح الصلاحية",
      );
      setCapability(null);
      setOrgUnit(null);
      setReason("");
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر منح الصلاحية");
    }
  };

  const onRevoke = async (grantId: string, capLabel: string) => {
    try {
      await revoke.mutateAsync(grantId);
      toast.success(`سُحبت «${capLabel}».`, "سحب الصلاحية");
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر سحب الصلاحية");
    }
  };

  const effectiveRows = caps.data
    ? Object.entries(CAPABILITY_LABELS).map(([cap, label]) => ({
      cap, label, held: (caps.data?.capabilities ?? []).includes(cap),
    }))
    : [];
  const activeGrants = (targetGrants.data ?? []).filter((g) => g.isActive);
  const revokedGrants = (targetGrants.data ?? []).filter((g) => !g.isActive);

  return (
    <Screen scroll padded={false}>
      <StackHeader title="الصلاحيات والأدوار" kicker="قدرات الخادم الفعلية" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        {/* ── the caller's own effective set — the server's word ── */}
        {caps.isLoading ? (
          <SkeletonList rows={5} />
        ) : caps.isError ? (
          <ErrorState message="تعذّر تحميل قدراتك الفعلية." onRetry={() => caps.refetch()} />
        ) : (
          <>
            <StatLine
              label="قدراتك الفعلية"
              value={`${caps.data?.capabilities.length ?? 0}`}
              hint={`دور العضوية: ${labelOf(PLATFORM_ROLE_LABELS, caps.data?.membershipRole ?? caps.data?.role ?? "—")}`}
            />
            <RowList>
              {effectiveRows.map((r, i) => (
                <LedgerRow key={r.cap} last={i === effectiveRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="medium">{r.label}</T>
                    </View>
                    {r.held ? <Badge label="مفعّلة" tone="mint" /> : <Badge label="غير مفعّلة" tone="grey" />}
                  </View>
                </LedgerRow>
              ))}
            </RowList>

            {/* ── the caller's own scoped grants (contract §12 rows) ── */}
            <T variant="h4" weight="bold">منحك الصريحة</T>
            {myGrants.isLoading ? (
              <SkeletonList rows={2} />
            ) : myGrants.isError ? (
              <T variant="sm" color="muted">تعذّر تحميل منحك — أعد المحاولة لاحقاً.</T>
            ) : (myGrants.data ?? []).length === 0 ? (
              <T variant="sm" color="muted">لا منح صريحة — قدراتك كلها من دور عضويتك.</T>
            ) : (
              <RowList>
                {(myGrants.data ?? []).map((g, i, arr) => (
                  <LedgerRow key={g.id} last={i === arr.length - 1}>
                    <View style={{ gap: 2 }}>
                      <T variant="body" weight="medium">
                        {labelOf(CAPABILITY_LABELS, g.capability)}
                      </T>
                      <T variant="xs" color="muted">
                        {g.orgUnit ? `نطاق: ${g.orgUnit.nameAr} (شجرة الوحدة)` : "نطاق: المؤسسة كاملة"}
                        {g.reason ? ` · ${g.reason}` : ""}
                      </T>
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            )}
          </>
        )}

        {/* ── the per-user grant management — capability-gated ─────── */}
        <T variant="h4" weight="bold">منح صلاحيات لمستخدم</T>
        {!canAssign ? (
          <T variant="sm" color="muted">
            تتطلب هذه الإدارة قدرة «منح صلاحيات النطاق» — الخادم لم يمنحها لعضويتك الحالية.
          </T>
        ) : (
          <>
            <SearchBar value={q} onChange={setQ} placeholder="ابحث عن مستخدم بالاسم أو البريد…" />
            {users.results.length > 0 && !selectedUser ? (
              <RowList>
                {users.results.map((u, i) => (
                  <LedgerRow
                    key={u.id}
                    last={i === users.results.length - 1}
                    accessibilityLabel={`اختيار المستخدم ${u.firstName} ${u.lastName} — ${u.email}`}
                    onPress={() => { setSelectedUser(u); setQ(""); setAppliedQ(""); appliedRef.current = ""; }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium">{u.firstName} {u.lastName}</T>
                        <T variant="xs" color="muted">{u.email}</T>
                      </View>
                      <Badge label={labelOf(PLATFORM_ROLE_LABELS, u.role)} tone="grey" />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            ) : null}

            {selectedUser ? (
              <View style={{ gap: sp[12] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                  <T variant="body" weight="bold">{selectedUser.firstName} {selectedUser.lastName}</T>
                  <Badge label={labelOf(PLATFORM_ROLE_LABELS, selectedUser.role)} tone="grey" />
                  <Button
                    label="تغيير المستخدم"
                    kind="ghost"
                    small
                    accessibilityLabel="إلغاء اختيار المستخدم الحالي"
                    onPress={() => { setSelectedUser(null); setCapability(null); setOrgUnit(null); }}
                  />
                </View>

                {myId === selectedUser.id ? (
                  <T variant="sm" color="danger">
                    هذه منحك أنت — لا يمكن تعديلها من هنا؛ اطلب من مالك أو إداري آخر تطبيق التغيير.
                  </T>
                ) : (
                  <>
                    {/* ── the target's current grants ── */}
                    {targetGrants.isLoading ? (
                      <SkeletonList rows={2} />
                    ) : targetGrants.isError ? (
                      <T variant="sm" color="muted">تعذّر تحميل منح هذا المستخدم.</T>
                    ) : (targetGrants.data ?? []).length === 0 ? (
                      <T variant="sm" color="muted">لا منح صريحة لهذا المستخدم بعد.</T>
                    ) : (
                      <>
                        <RowList>
                          {activeGrants.map((g, i) => (
                            <LedgerRow key={g.id} last={i === activeGrants.length - 1}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                                <View style={{ flex: 1, gap: 2 }}>
                                  <T variant="body" weight="medium">{labelOf(CAPABILITY_LABELS, g.capability)}</T>
                                  <T variant="xs" color="muted">
                                    {g.orgUnit ? `نطاق: ${g.orgUnit.nameAr} (شجرة الوحدة)` : "نطاق: المؤسسة كاملة"}
                                    {g.reason ? ` · ${g.reason}` : ""}
                                  </T>
                                </View>
                                <Button
                                  label="سحب"
                                  kind="ghost"
                                  small
                                  disabled={revoke.isPending}
                                  onPress={() => onRevoke(g.id, labelOf(CAPABILITY_LABELS, g.capability))}
                                />
                              </View>
                            </LedgerRow>
                          ))}
                        </RowList>
                        {revokedGrants.length > 0 ? (
                          <View style={{ gap: sp[6] }}>
                            <T variant="xs" color="faint">المنح المسحوبة ({revokedGrants.length}):</T>
                            {revokedGrants.map((g) => (
                              <T key={g.id} variant="xs" color="muted">
                                {labelOf(CAPABILITY_LABELS, g.capability)}
                                {g.orgUnit ? ` · ${g.orgUnit.nameAr}` : ""}
                                {g.revokedAt ? ` · سُحبت ${g.revokedAt.slice(0, 10)}` : ""}
                              </T>
                            ))}
                          </View>
                        ) : null}
                      </>
                    )}

                    {/* ── the grant form: ONE capability + scope ── */}
                    <T variant="sm" weight="medium">منح قدرة جديدة</T>
                    <SelectField
                      label="القدرة"
                      value={capability}
                      options={capOptions}
                      onSelect={(id) => setCapability(capOptions.find((c) => c.id === id) ?? null)}
                      loading={false}
                      placeholder="اختر قدرة واحدة…"
                    />
                    <SelectField
                      label="النطاق (اختياري — المؤسسة كاملة عند تركه)"
                      value={orgUnit}
                      options={unitOptions}
                      onSelect={(id) => setOrgUnit(unitOptions.find((u) => u.id === id) ?? null)}
                      loading={tree.isLoading}
                      placeholder="نطاق الوحدة…"
                    />
                    <T variant="xs" color="faint">
                      منح بنطاق وحدة يسري على شجرة تلك الوحدة فقط — ليس على المؤسسة كلها.
                    </T>
                    <SearchBar value={reason} onChange={setReason} placeholder="سبب المنح (اختياري)…" />
                    <Button
                      label={grant.isPending ? "جارٍ المنح…" : "منح القدرة"}
                      disabled={!capability || grant.isPending}
                      onPress={onGrant}
                    />
                  </>
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
