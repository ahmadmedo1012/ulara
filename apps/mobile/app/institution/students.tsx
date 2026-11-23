import { useState } from "react";
import { View } from "react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { Segmented } from "@/components/ui/fields";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { useLearners, useEnrollments, useCredentials } from "@/features/institutional/queries";
import {
  LEARNER_CATEGORY_LABELS, LEARNER_STATUS_LABELS, ENROLLMENT_STATUS_LABELS,
  CREDENTIAL_STATUS_LABELS, labelOf, toneOf,
} from "@/features/institutional/labels";

/**
 * /institution/students — the learner register (web StudentsPage
 * parity, read surface): the canonical learner list (STUDENT +
 * TRAINEE — account optional per contract §5), the program
 * enrollments, and the awarded credentials — one segmented surface.
 */
export default function InstitutionStudents() {
  const p = usePalette();
  const [tab, setTab] = useState("learners");

  const learners = useLearners({ limit: 50 });
  const enrollments = useEnrollments({ limit: 50 });
  const credentials = useCredentials({ limit: 50 });

  const learnerRows = Array.isArray(learners.data) ? learners.data : learners.data?.data ?? [];
  const enrollmentRows = Array.isArray(enrollments.data) ? enrollments.data : enrollments.data?.data ?? [];
  const credentialRows = Array.isArray(credentials.data) ? credentials.data : credentials.data?.data ?? [];

  const list = tab === "learners" ? learners : tab === "enrollments" ? enrollments : credentials;
  const rows = tab === "learners" ? learnerRows : tab === "enrollments" ? enrollmentRows : credentialRows;

  const emptyCopy =
    tab === "learners"
      ? { title: "لا متعلمون بعد", message: "سجل المتعلمين فارغ — الطلاب والمتدربون المسجلون في هذه المؤسسة." }
      : tab === "enrollments"
        ? { title: "لا تسجيلات بعد", message: "لا تسجيلات في البرامج بعد." }
        : { title: "لا شهادات بعد", message: "لم تُمنح شهادات بعد — الشهادات الممنوحة والمسحوبة تظهر هنا." };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="الطلاب والمتدربون" kicker="سجل المتعلمين" />
      <View style={{ flex: 1, gap: sp[12], padding: sp[16] }}>
        <Segmented
          options={[
            { id: "learners", label: `المتعلمون (${learnerRows.length})` },
            { id: "enrollments", label: `التسجيلات (${enrollmentRows.length})` },
            { id: "credentials", label: `الشهادات (${credentialRows.length})` },
          ]}
          selectedId={tab}
          onSelect={setTab}
        />

        {tab === "learners" && rows.length > 0 ? (
          <StatLine
            label="المتعلمون المعروضون"
            value={`${learnerRows.length}`}
            hint={`${learnerRows.filter((l) => l.category === "TRAINEE").length} متدرب`}
          />
        ) : null}

        {list.isLoading ? (
          <SkeletonList rows={8} />
        ) : list.isError ? (
          <ErrorState message="تعذّر تحميل سجل المتعلمين." onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
        ) : (
          <RowList>
            {tab === "learners" &&
              learnerRows.map((l, i) => (
                <LedgerRow key={l.id} last={i === learnerRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{l.displayName}</T>
                      <T variant="xs" color="muted">
                        {labelOf(LEARNER_CATEGORY_LABELS, l.category)}
                        {l.universityId ? ` · ${l.universityId}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(LEARNER_STATUS_LABELS, l.status)} tone={toneOf(l.status)} />
                  </View>
                </LedgerRow>
              ))}
            {tab === "enrollments" &&
              enrollmentRows.map((e, i) => (
                <LedgerRow key={e.id} last={i === enrollmentRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{e.learnerProfile?.displayName ?? "متعلم غير مرتبط"}</T>
                      <T variant="xs" color="muted">
                        {e.program?.nameAr ?? "برنامج غير مرتبط"}
                        {e.expectedCompletionAt ? ` · إتمام متوقع ${e.expectedCompletionAt.slice(0, 10)}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(ENROLLMENT_STATUS_LABELS, e.status)} tone={toneOf(e.status)} />
                  </View>
                </LedgerRow>
              ))}
            {tab === "credentials" &&
              credentialRows.map((c, i) => (
                <LedgerRow key={c.id} last={i === credentialRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">{c.credentialType?.nameAr ?? "شهادة غير مسماة"}</T>
                      <T variant="xs" color="muted">
                        {c.learnerProfile?.displayName ?? "متعلم غير مرتبط"}
                        {c.awardedAt ? ` · مُنحت ${c.awardedAt.slice(0, 10)}` : ""}
                        {c.serialNumber ? ` · رقم ${c.serialNumber}` : ""}
                      </T>
                    </View>
                    <Badge label={labelOf(CREDENTIAL_STATUS_LABELS, c.status)} tone={toneOf(c.status)} />
                  </View>
                </LedgerRow>
              ))}
          </RowList>
        )}
      </View>
    </View>
  );
}
