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
import {
  useLearnersPaged, useEnrollmentsPaged, useCredentialsPaged,
} from "@/features/institutional/queries";
import type { LearnerProfileRow, ProgramEnrollment, AwardedCredential } from "@/api/institutional";
import {
  LEARNER_CATEGORY_LABELS, LEARNER_STATUS_LABELS, ENROLLMENT_STATUS_LABELS,
  CREDENTIAL_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/* ── the three registers' rows — memoized at module scope ────────── */

const LearnerRow = makeRow<LearnerProfileRow>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.fullNameAr}</T>
          <T variant="xs" color="muted">
            {labelOf(LEARNER_CATEGORY_LABELS, item.category)}
            {item.learnerNumber ? ` · ${item.learnerNumber}` : ""}
          </T>
        </View>
        <Badge label={labelOf(LEARNER_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

const EnrollmentRow = makeRow<ProgramEnrollment>(({ item }) => {
  const p = usePalette();
  const displayName = item.learnerProfile?.fullNameAr ??
    (item.studentProfile?.user
      ? `${item.studentProfile.user.firstName ?? ""} ${item.studentProfile.user.lastName ?? ""}`.trim()
      : null);
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{displayName ?? "متعلم غير مرتبط"}</T>
          <T variant="xs" color="muted">
            {item.program?.nameAr ?? "برنامج غير مرتبط"}
            {item.expectedCompletionAt ? ` · إتمام متوقع ${item.expectedCompletionAt.slice(0, 10)}` : ""}
          </T>
        </View>
        <Badge label={labelOf(ENROLLMENT_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

const CredentialRow = makeRow<AwardedCredential>(({ item }) => {
  const p = usePalette();
  return (
    <LedgerRow style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="medium">{item.credentialType?.nameAr ?? "شهادة غير مسماة"}</T>
          <T variant="xs" color="muted">
            {item.learnerProfile?.fullNameAr ?? "متعلم غير مرتبط"}
            {item.conferredAt ? ` · مُنحت ${item.conferredAt.slice(0, 10)}` : ""}
            {item.serialNumber ? ` · رقم ${item.serialNumber}` : ""}
          </T>
        </View>
        <Badge label={labelOf(CREDENTIAL_STATUS_LABELS, item.status)} tone={toneOf(item.status)} />
      </View>
    </LedgerRow>
  );
});

/**
 * /institution/students — the learner register (web StudentsPage
 * parity, read surface): the canonical learner list (STUDENT +
 * TRAINEE — account optional per contract §5), the program
 * enrollments, and the awarded credentials — one segmented surface.
 * Every segment is its own fully-paged DataList (the pager follows
 * the server's meta — no first-page cap).
 */
export default function InstitutionStudents() {
  const [tab, setTab] = useState("learners");

  const learners = useLearnersPaged();
  const enrollments = useEnrollmentsPaged();
  const credentials = useCredentialsPaged();

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="الطلاب والمتدربون" kicker="سجل المتعلمين" />
      <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], gap: sp[12] }}>
        <Segmented
          options={[
            { id: "learners", label: `المتعلمون (${latn(learners.meta?.total ?? learners.items.length)})` },
            { id: "enrollments", label: `التسجيلات (${latn(enrollments.meta?.total ?? enrollments.items.length)})` },
            { id: "credentials", label: `الشهادات (${latn(credentials.meta?.total ?? credentials.items.length)})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />
        <T variant="xs" color="faint">
          {tab === "learners"
            ? `${latn(learners.items.length)} معروضاً${learners.meta && learners.meta.total > learners.items.length ? ` من ${latn(learners.meta.total)} وفق سجل المؤسسة` : ""}`
            : tab === "enrollments"
              ? `${latn(enrollments.items.length)} معروضاً${enrollments.meta && enrollments.meta.total > enrollments.items.length ? ` من ${latn(enrollments.meta.total)} وفق سجل المؤسسة` : ""}`
              : `${latn(credentials.items.length)} معروضاً${credentials.meta && credentials.meta.total > credentials.items.length ? ` من ${latn(credentials.meta.total)} وفق سجل المؤسسة` : ""}`}
        </T>
      </View>
      <View style={{ flex: 1, paddingTop: sp[8] }}>
        {tab === "learners" ? (
          <DataList
            data={learners.items}
            renderItem={({ item }) => <LearnerRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={learners.isLoading}
            isError={learners.isError}
            emptyTitle="لا متعلمون بعد"
            emptyMessage="سجل المتعلمين فارغ — الطلاب والمتدربون المسجلون في هذه المؤسسة."
            onRetry={() => learners.refetch()}
            refetch={learners.refetch}
            isRefetching={learners.isRefetching}
            onEndReached={learners.onEndReached}
            isFetchingNextPage={learners.isFetchingNextPage}
            hasNextPage={learners.hasNextPage}
            loadMoreError={learners.loadMoreError}
            onRetryLoadMore={learners.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        ) : tab === "enrollments" ? (
          <DataList
            data={enrollments.items}
            renderItem={({ item }) => <EnrollmentRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={enrollments.isLoading}
            isError={enrollments.isError}
            emptyTitle="لا تسجيلات بعد"
            emptyMessage="لا تسجيلات في البرامج بعد."
            onRetry={() => enrollments.refetch()}
            refetch={enrollments.refetch}
            isRefetching={enrollments.isRefetching}
            onEndReached={enrollments.onEndReached}
            isFetchingNextPage={enrollments.isFetchingNextPage}
            hasNextPage={enrollments.hasNextPage}
            loadMoreError={enrollments.loadMoreError}
            onRetryLoadMore={enrollments.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        ) : (
          <DataList
            data={credentials.items}
            renderItem={({ item }) => <CredentialRow item={item} />}
            keyExtractor={(r) => r.id}
            isLoading={credentials.isLoading}
            isError={credentials.isError}
            emptyTitle="لا شهادات بعد"
            emptyMessage="لم تُمنح شهادات بعد — الشهادات الممنوحة والمسحوبة تظهر هنا."
            onRetry={() => credentials.refetch()}
            refetch={credentials.refetch}
            isRefetching={credentials.isRefetching}
            onEndReached={credentials.onEndReached}
            isFetchingNextPage={credentials.isFetchingNextPage}
            hasNextPage={credentials.hasNextPage}
            loadMoreError={credentials.loadMoreError}
            onRetryLoadMore={credentials.retryLoadMore}
            contentPadding={{ horizontal: 16, bottom: 24 }}
          />
        )}
      </View>
    </Screen>
  );
}
