import { useState } from "react";
import { Share, View } from "react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { EmptyState } from "@/components/ui/states";
import { Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { adminApi } from "@/api/admin";
import { ApiError } from "@/api/client";

/** The exact header row the backend's template ships (lib/bulk-import.ts) —
 *  order-insensitive, matched after trim. */
const TEMPLATE_CSV = "الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة";

/** One preview row — the server's own BulkImportResultRow. */
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
  summary: { total: number; ok: number; error: number };
}

/** The commit's answer: what ACTUALLY landed (created + skipped). */
interface CommitResult {
  created: number;
  skipped: number;
  sheet: { name: string; email: string; universityId: string; tempPassword: string }[];
}

/** The temp-password sheet as shareable text (the registrar hands these out). */
function sheetToText(sheet: CommitResult["sheet"]): string {
  const lines = sheet.map(
    (s) => `${s.name} · ${s.email} · ${s.universityId} · ${s.tempPassword}`,
  );
  return ["كلمات المرور المؤقتة — دفعة الطلاب", ...lines].join("\n");
}

/**
 * /admin/bulk-import — the cohort intake. The server's REAL behavior
 * (users.routes.ts POST /users/bulk-import/commit): the VALID rows are
 * created in one transaction; the INVALID rows are SKIPPED and their
 * count comes back as `skipped` — never «الدفعة كاملة أو لا شيء».
 * The screen is honest about it end-to-end:
 *  · The preview is tied to the exact CSV + institution context it
 *    was made under — editing either one invalidates it immediately
 *    (a commit can never ride a stale preview).
 *  · ONE explicit confirmation step shows the EXACT counts: how many
 *    accounts will be created, how many rows will be skipped.
 *  · Inputs lock while the commit is in flight; a TIMEOUT/network
 *    failure is surfaced as «النتيجة غير مؤكدة» (the request may have
 *    landed — re-preview and let the duplicate-email errors tell).
 *  · The result shown is the SERVER's created/skipped, not the plan's
 *    expectation.
 *  · Temp passwords are one-time secrets: they live in screen state
 *    only (never AsyncStorage/query cache/logs), shareable via the
 *    platform Share sheet, and copyable as selectable text.
 */
export default function AdminBulkImport() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const [csv, setCsv] = useState("");
  /**
   * §10 — the preview/result state carries the CSV + institution it
   * was made under, and STALENESS is derived at render (no reset
   * effect): editing the CSV or switching the institution context
   * detaches the plan instantly — a commit can only ever ride the
   * preview of THIS csv under THIS institution.
   */
  const [attachment, setAttachment] = useState<{
    csv: string;
    scope: string | null;
    plan: PreviewPlan | null;
    result: CommitResult | null;
  } | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);

  const live = attachment && attachment.csv === csv && attachment.scope === scope ? attachment : null;
  const plan = live?.plan ?? null;
  const result = live?.result ?? null;

  const okRows = plan?.rows.filter((r) => r.status === "ok") ?? [];
  const errorRows = plan?.rows.filter((r) => r.status === "error") ?? [];

  const onPreview = async () => {
    if (!csv.trim()) {
      toast.error("الصق قائمة CSV أولاً.", "الاستيراد الجماعي");
      return;
    }
    setBusy("preview");
    setConfirming(false);
    try {
      const data = (await adminApi.bulkPreview(csv, scope ?? undefined)) as unknown as
        PreviewPlan | { fileError: string };
      if ("fileError" in data) {
        toast.error(data.fileError, "قالب الملف");
        setAttachment({ csv, scope, plan: null, result: null });
        return;
      }
      setAttachment({ csv, scope, plan: data, result: null });
      const okCount = data.rows?.filter((r) => r.status === "ok").length ?? 0;
      const errorCount = data.rows?.filter((r) => r.status === "error").length ?? 0;
      toast.success(
        `العرض المسبق: ${latn(okCount)} صفاً صالحاً · ${latn(errorCount)} صفاً بخطأ.`,
        "العرض المسبق",
      );
    } catch (e) {
      toast.error(humanizeError(e), "تعذّر العرض المسبق");
    } finally {
      setBusy(null);
    }
  };

  const onCommit = async () => {
    setConfirming(false);
    setBusy("commit");
    setAmbiguous(false);
    try {
      const data = (await adminApi.bulkCommit(csv, scope ?? undefined)) as unknown as CommitResult;
      setAttachment({ csv, scope, plan: null, result: data });
      toast.success(
        `أنشأ الخادم ${latn(data.created)} حساباً وتخطى ${latn(data.skipped)} صفاً خاطئاً — وفق نتيجته الفعلية.`,
        "الاستيراد الجماعي",
      );
    } catch (e) {
      /* A timeout/network failure AFTER the request left is an
       * AMBIGUOUS outcome (the cohort may exist now): say so, and let
       * the duplicate-email errors on a fresh preview tell the truth. */
      if (e instanceof ApiError && (e.code === "TIMEOUT" || e.code === "NETWORK")) {
        setAmbiguous(true);
        toast.error(
          "تعذّر تأكيد نتيجة الاستيراد — قد تكون الدفعة نُفذت. أعد العرض المسبق: البريد المسجل مسبقاً سيظهر خطأً إن كانت الحسابات أُنشئت.",
          "نتيجة غير مؤكدة",
        );
      } else {
        toast.error(humanizeError(e), "تعذّر تنفيذ الاستيراد");
      }
    } finally {
      setBusy(null);
    }
  };

  const shareSheet = async () => {
    if (!result) return;
    try {
      await Share.share({ message: sheetToText(result.sheet), title: "كلمات المرور المؤقتة" });
    } catch {
      toast.error("المشاركة غير متاحة هنا — انسخ كلمات المرور من النص أعلاه (اضغط مطولاً).", "تسليم كلمات المرور");
    }
  };

  const inputsLocked = busy !== null;

  return (
    <Screen scroll padded={false}>
      <StackHeader title="الاستيراد الجماعي" kicker="دفعة الطلاب من CSV" />
      <View style={{ gap: sp[12], padding: sp[16] }}>
        <T variant="sm" color="muted">
          الصق قائمة دفعة الطلاب بصيغة CSV — الترويسة المطلوبة بالضبط:
        </T>
        <T variant="xs" color="faint">{TEMPLATE_CSV}</T>
        <T variant="xs" color="faint">
          عند التنفيذ: تُنشأ الخادم الصفوف الصالحة في معاملة واحدة، ويتخطى الصفوف الخاطئة — ويعيد عددها في النتيجة. صحّح الأخطاء وأعد العرض قبل الإنشاء.
        </T>

        <Field
          label="محتوى CSV"
          value={csv}
          onChangeText={inputsLocked ? () => undefined : setCsv}
          multiline
          placeholder={`${TEMPLATE_CSV}\nأحمد,الفيتوري,a@x.edu,2027001,هندسة,حاسب,1`}
        />

        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <Button
            label={busy === "preview" ? "جارٍ العرض…" : "عرض مسبق"}
            disabled={inputsLocked || !csv.trim()}
            onPress={onPreview}
          />
          <Button
            label={busy === "commit" ? "جارٍ الإنشاء…" : `إنشاء ${latn(okRows.length)} حساباً`}
            kind="ghost"
            disabled={inputsLocked || okRows.length === 0}
            onPress={() => setConfirming(true)}
          />
        </View>

        {confirming && !inputsLocked ? (
          <View style={{ gap: sp[8], borderWidth: 1, borderColor: p.accentInk, backgroundColor: p.accentSoft, padding: sp[12] }}>
            <T variant="sm" weight="bold">تأكيد الاستيراد</T>
            <T variant="sm" color="muted">
              سيُنشأ {latn(okRows.length)} حساباً طالباً الآن، وسيُتخطى {latn(errorRows.length)} صفاً خاطئاً (لن يُنشأ ولن يُصحّح تلقائياً).
              كلمات المرور المؤقتة ستظهر مرة واحدة بعد الإنشاء — سجّلها أو شاركها فوراً.
            </T>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <Button label="تأكيد الإنشاء" disabled={inputsLocked} onPress={onCommit} />
              <Button label="إلغاء" kind="ghost" onPress={() => setConfirming(false)} />
            </View>
          </View>
        ) : null}

        {ambiguous ? (
          <T variant="sm" color="danger">
            نتيجة آخر محاولة غير مؤكدة — قد تكون الدفعة نُفذت. أعد العرض المسبق لترى الحقيقة (البريد المسجل مسبقاً يظهر خطأً).
          </T>
        ) : null}

        {plan ? (
          <>
            <StatLine
              label="خطة الاستيراد"
              value={`${latn(okRows.length)} صالحاً · ${latn(errorRows.length)} بخطأ`}
              tone={errorRows.length > 0 ? "danger" : "accent"}
            />
            {errorRows.length > 0 ? (
              <T variant="xs" color="danger">
                الصفوف الخاطئة ستُتخطى عند التنفيذ — صحّحها ثم أعد العرض المسبق.
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
                        {r.status === "error"
                          ? (r.message ?? "—")
                          : `${r.email ?? "—"} · ${r.universityId ?? "—"}${r.faculty ? ` · ${r.faculty} / ${r.department}` : ""}`}
                      </T>
                    </View>
                    {r.status === "ok" ? (
                      <Badge label="سيُنشأ" tone="mint" />
                    ) : (
                      <Badge label="سيُتخطى" tone="rose" />
                    )}
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </>
        ) : (
          <EmptyState title="لا خطة بعد" message="الصق CSV ثم اطلب العرض المسبق — الخادم يتحقق من التكرار ويسمّي الكليات والأقسام قبل أي إنشاء." />
        )}

        {result ? (
          <>
            <T variant="h4" weight="bold">نتيجة الخادم الفعلية</T>
            <StatLine
              label="الحسابات المنشأة"
              value={latn(result.created)}
              tone="accent"
              hint={result.skipped > 0 ? `تخطى ${latn(result.skipped)} صفاً خاطئاً وفق نتيجة الخادم` : "بلا صفوف متخطاة"}
            />
            <T variant="h4" weight="bold">كلمات المرور المؤقتة</T>
            <T variant="xs" color="danger">
              سجّلها الآن — تظهر هنا مرة واحدة فقط ثم تختفي عند مغادرة الصفحة، ولا تُحفظ في التطبيق.
            </T>
            <Button label="مشاركة المرسال (تسليم كلمات المرور)" kind="ghost" onPress={shareSheet} />
            <RowList>
              {result.sheet.map((s, i) => (
                <LedgerRow key={s.email} last={i === result.sheet.length - 1}>
                  <View style={{ gap: 2 }}>
                    <T variant="body" weight="medium">{s.name}</T>
                    <T variant="xs" color="muted">{s.email} · {s.universityId}</T>
                    <T variant="sm" weight="bold">{s.tempPassword}</T>
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
