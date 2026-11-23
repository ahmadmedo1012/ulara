import { useState } from "react";
import { View, ScrollView } from "react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { adminApi } from "@/api/admin";

/** The exact header row the backend's template ships (lib/bulk-import.ts) —
 *  order-insensitive, matched after trim. */
const TEMPLATE_CSV = "الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة";

interface PreviewRow {
  line: number;
  status: string;
  message?: string;
  email?: string;
  universityId?: string;
  firstName?: string;
  lastName?: string;
  faculty?: string;
  department?: string;
}

interface PreviewPlan {
  rows: PreviewRow[];
  summary?: { total: number; ok: number; error: number; rowErrors?: { line: number; message: string }[] };
}

/**
 * /admin/bulk-import — the cohort intake (r353: the screen the parity
 * doc claimed but never shipped — the phantom row made real): paste
 * the registrar's class-list CSV → the server plans it against the DB
 * (POST /users/bulk-import/preview — email/reg-number duplicates,
 * faculty/department name resolution) → the honest per-row preview →
 * ONE transactional commit (the cohort lands whole or not at all),
 * with the temporary-password sheet the commit returns.
 */
export default function AdminBulkImport() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const [csv, setCsv] = useState("");
  const [plan, setPlan] = useState<PreviewPlan | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [sheet, setSheet] = useState<{ name: string; email: string; universityId: string; tempPassword: string }[] | null>(null);

  const okRows = plan?.rows.filter((r) => r.status === "ok") ?? [];
  const errorRows = plan?.rows.filter((r) => r.status === "error") ?? [];

  const onPreview = async () => {
    if (!csv.trim()) {
      toast.error("الصق قائمة CSV أولاً.", "الاستيراد الجماعي");
      return;
    }
    setBusy("preview");
    try {
      const data = await adminApi.bulkPreview(csv, scope ?? undefined) as unknown as PreviewPlan;
      setPlan(data);
      setSheet(null);
      const okCount = data.rows?.filter((r) => r.status === "ok").length ?? 0;
      toast.success(`العرض المسبق: ${latn(okCount)} صفاً صالحاً من ${latn(data.rows?.length ?? 0)}.`, "العرض المسبق");
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر العرض المسبق");
    } finally {
      setBusy(null);
    }
  };

  const onCommit = async () => {
    setBusy("commit");
    try {
      const data = await adminApi.bulkCommit(csv, scope ?? undefined) as unknown as
        { sheet?: { name: string; email: string; universityId: string; tempPassword: string }[] };
      if (Array.isArray(data?.sheet)) {
        setSheet(data.sheet);
        toast.success(`أُنشئ ${latn(data.sheet.length)} حساباً في معاملة واحدة.`, "الاستيراد الجماعي");
      } else {
        toast.success("أُنشئت الدفعة.", "الاستيراد الجماعي");
      }
      setPlan(null);
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر تنفيذ الاستيراد");
    } finally {
      setBusy(null);
    }
  };

  const isOwner = user?.role === "OWNER";

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StackHeader title="الاستيراد الجماعي" kicker="دفعة الطلاب من CSV" />
      <ScrollView contentContainerStyle={{ gap: sp[12], padding: sp[16] }} style={{ flex: 1 }}>
        <T variant="sm" color="muted">
          الصق قائمة الكتيبة بصيغة CSV — الترويسة المطلوبة بالضبط:
        </T>
        <T variant="xs" color="faint">{TEMPLATE_CSV}</T>

        <Field
          label="محتوى CSV"
          value={csv}
          onChangeText={setCsv}
          multiline
          placeholder={`${TEMPLATE_CSV}\nأحمد,الفيتوري,a@x.edu,2027001,هندسة,حاسب,1`}
        />

        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <Button
            label={busy === "preview" ? "جارٍ العرض…" : "عرض مسبق"}
            disabled={busy !== null || !csv.trim()}
            onPress={onPreview}
          />
          <Button
            label={busy === "commit" ? "جارٍ الإنشاء…" : `إنشاء ${latn(okRows.length)} حساباً`}
            kind="ghost"
            disabled={busy !== null || okRows.length === 0}
            onPress={onCommit}
          />
        </View>

        {plan ? (
          <>
            <StatLine
              label="خطة الاستيراد"
              value={`${latn(okRows.length)} صالحاً · ${latn(errorRows.length)} بخطأ`}
              tone={errorRows.length > 0 ? "danger" : "accent"}
              hint={isOwner && !scope ? "بدون سياق مؤسسة — إنشاءٌ على مستوى المنصة" : undefined}
            />
            {errorRows.length > 0 ? (
              <T variant="xs" color="danger">
                الصفوف الخاطئة لن تُنشأ — صحّحها ثم أعد العرض المسبق. المعاملة تنشئ الدفعة كاملة أو لا شيء.
              </T>
            ) : null}
            <RowList>
              {plan.rows.map((r, i) => (
                <LedgerRow key={`${r.line}-${i}`} last={i === plan.rows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="medium">
                        {r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : (r.email ?? `السطر ${r.line}`)}
                      </T>
                      <T variant="xs" color="muted" numberOfLines={2}>
                        {r.message ?? `${r.email ?? "—"} · ${r.universityId ?? "—"}${r.faculty ? ` · ${r.faculty} / ${r.department}` : ""}`}
                      </T>
                    </View>
                    {r.status === "ok" ? (
                      <Badge label="سيُنشأ" tone="mint" />
                    ) : (
                      <Badge label="خطأ" tone="rose" />
                    )}
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </>
        ) : (
          <EmptyState title="لا خطة بعد" message="الصق CSV ثم اطلب العرض المسبق — الخادم يتحقق من التكرار ويسمّي الكليات والأقسام قبل أي إنشاء." />
        )}

        {sheet ? (
          <>
            <T variant="h4" weight="bold">كلمات المرور المؤقتة</T>
            <T variant="xs" color="danger">
              سجّلها الآن — تظهر مرة واحدة فقط عند الإنشاء، ولن يستطيع الطلاب تغييرها قبل أول دخول.
            </T>
            <RowList>
              {sheet.map((s, i) => (
                <LedgerRow key={s.email} last={i === sheet.length - 1}>
                  <View style={{ gap: 2 }}>
                    <T variant="body" weight="medium">{s.name}</T>
                    <T variant="xs" color="muted">{s.email} · {s.universityId}</T>
                    <T variant="xs" color="faint">{s.tempPassword}</T>
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
