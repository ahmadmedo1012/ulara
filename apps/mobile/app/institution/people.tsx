import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { SearchBar } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { usePeople } from "@/features/institutional/queries";
import { STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

/**
 * /institution/people — the staff register (web PeoplePage parity,
 * read surface): the real people list from GET /institutional/people —
 * teaching staff, trainers, administrative staff — with the live
 * search box and the category/status chips. Tapping a person opens
 * their record (appointments + contact + platform link).
 */
export default function InstitutionPeople() {
  const p = usePalette();
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  /* the house debounce (admin/students parity): 300ms between keystrokes
   * before the query re-keys. */
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

  const people = usePeople({ q: appliedQ || undefined, limit: 50 });

  const rows = Array.isArray(people.data) ? people.data : people.data?.data ?? [];
  const count = Array.isArray(people.data) ? rows.length : people.data?.meta?.total ?? rows.length;
  const byCategory = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="الأفراد والكوادر" kicker="سجل الأفراد" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
        />
        {rows.length > 0 ? (
          <StatLine
            label="الأفراد المعروضون"
            value={`${count}`}
            hint={
              Object.entries(byCategory)
                .map(([k, n]) => `${labelOf(STAFF_CATEGORY_LABELS, k)}: ${n}`)
                .join(" · ") || undefined
            }
          />
        ) : null}
        {people.isLoading ? (
          <SkeletonList rows={8} />
        ) : people.isError ? (
          <ErrorState message="تعذّر تحميل سجل الأفراد." onRetry={() => people.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا أفراد بعد" message="سجل الأفراد فارغ لهذه المؤسسة — هيئة التدريس والمدربون والموظفون يظهرون هنا." />
        ) : (
          <RowList>
            {rows.map((person, i) => (
              <LedgerRow
                key={person.id}
                last={i === rows.length - 1}
                accessibilityLabel={person.displayName}
                onPress={() => router.push(`/institution/people/${person.id}` as never)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">{person.displayName}</T>
                    <T variant="xs" color="muted">
                      {labelOf(STAFF_CATEGORY_LABELS, person.category)}
                      {person.staffNumber ? ` · ${person.staffNumber}` : ""}
                      {person.primaryOrgUnit ? ` · ${person.primaryOrgUnit.nameAr}` : ""}
                    </T>
                  </View>
                  <Badge label={labelOf(STAFF_STATUS_LABELS, person.status)} tone={toneOf(person.status)} />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
