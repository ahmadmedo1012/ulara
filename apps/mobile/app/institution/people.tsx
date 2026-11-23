import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { SearchBar } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { usePeoplePaged } from "@/features/institutional/queries";
import type { Person } from "@/api/institutional";
import { STAFF_CATEGORY_LABELS, STAFF_STATUS_LABELS, labelOf, toneOf } from "@/features/institutional/labels";

/** The person row — memoized at MODULE scope (DataList/FlashList purity:
 * the row re-renders only when its own item identity changes). */
const PersonRow = makeRow<Person>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow
      accessibilityLabel={item.fullNameAr}
      onPress={() => router.push(`/institution/people/${item.id}` as never)}
      style={{ backgroundColor: p.surface }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.fullNameAr}</T>
          <T variant="xs" color="muted">
            {labelOf(STAFF_CATEGORY_LABELS, item.category)}
            {item.staffNumber ? ` · ${item.staffNumber}` : ""}
          </T>
        </View>
        <Badge label={labelOf(STAFF_STATUS_LABELS, item.staffStatus)} tone={toneOf(item.staffStatus)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/people — the staff register (web PeoplePage parity,
 * read surface): the real people list from GET /institutional/people —
 * teaching staff, trainers, administrative staff — with the live
 * search box, the server's honest total, and FULL pagination
 * (DataList + usePagedList: every page reachable — no first-page cap).
 * Tapping a person opens their record (appointments + contact +
 * platform link).
 */
export default function InstitutionPeople() {
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

  const people = usePeoplePaged({ q: appliedQ || undefined });
  const total = people.meta?.total ?? people.items.length;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="الأفراد والكوادر" kicker="سجل الأفراد" />
      {/* the fixed header — search + the server's honest total; the
          DataList below IS the scroller (one scroller per screen). */}
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
        />
        <T variant="xs" color="faint">
          {latn(people.items.length)} معروضاً{total > people.items.length ? ` من ${latn(total)} وفق سجل المؤسسة` : ""}
          {appliedQ ? ` · نتائج البحث عن «${appliedQ}»` : ""}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        <DataList
          data={people.items}
          renderItem={({ item }) => <PersonRow item={item} />}
          keyExtractor={(person) => person.id}
          isLoading={people.isLoading}
          isError={people.isError}
          emptyTitle={appliedQ ? "لا نتائج تطابق البحث" : "لا أفراد بعد"}
          emptyMessage={
            appliedQ
              ? "لم نجد فرداً يطابق بحثك — جرّب اسماً أو رقماً وظيفياً آخر."
              : "سجل الأفراد فارغ لهذه المؤسسة — هيئة التدريس والمدربون والموظفون يظهرون هنا."
          }
          onRetry={() => people.refetch()}
          refetch={people.refetch}
          isRefetching={people.isRefetching}
          onEndReached={people.onEndReached}
          isFetchingNextPage={people.isFetchingNextPage}
          hasNextPage={people.hasNextPage}
          loadMoreError={people.loadMoreError}
          onRetryLoadMore={people.retryLoadMore}
          contentPadding={{ horizontal: 16, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
