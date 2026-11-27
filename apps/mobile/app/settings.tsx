import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import Flag from "lucide-react-native/icons/flag";
import Hash from "lucide-react-native/icons/hash";
import Moon from "lucide-react-native/icons/moon";
import Vibrate from "lucide-react-native/icons/vibrate";
import Volume2 from "lucide-react-native/icons/volume-2";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiWithCookieCapture, ApiError, get, put } from "@/api/client";
import { useSession, ROLE_LABELS, POSITION_LABELS, RANK_LABELS } from "@/auth/session";
import { setThemePreference, usePalette, useThemePreference, type ThemePreference } from "@/design/theme";
import { unregisterPushDevices } from "@/lib/push";
import { NUMERALS_OPTIONS, useNumerals } from "@/lib/format";
import { haptics } from "@/haptics";
import { sound } from "@/sound";
import { sp, touchFloor } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { Field, Segmented, SecretField } from "@/components/ui/fields";
import { ConfirmSheet } from "@/components/ui/sheet";
import { ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { authenticate, biometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric";
import { humanizeError } from "@/lib/errors";
import type { SessionResponse } from "@/api/types";
import Constants from "expo-constants";
import { pressFeedback } from "@/motion";

/** /settings — the SHARED settings surface (every role). R341 M3: the
 *  30-row wall of boxed one-per-setting cards is dead — rows are grouped
 *  by concern under muted group headers ([01] التفضيلات · [02] الحساب ·
 *  [03] الأمان · [04] الدعم · [05] الجلسة · [06] الإشعارات), and every
 *  row sits on the ledger rhythm (RowList/LedgerRow hairlines, 48px
 *  targets), tokens only. The measured hierarchy: the page title carries
 *  the loud tier, group headers stay muted so the rows — the actual
 *  seats — read first. The student Profile keeps a one-tap mirror of the
 *  same toggles; both seats read/write the identical persisted state, so
 *  they can never disagree. r359 A4 appends [06] الإشعارات — the
 *  server-side per-category preference seat (GET/PUT
 *  /me/notification-preferences), behind no role gate: every logged-in
 *  user sees it. */
/** r359 A4 — GET/PUT /me/notification-preferences (the wire shape every
 *  logged-in user owns; the server answers the effective set — defaults
 *  when no row exists: all four push categories ON · emailDigest OFF). */
interface NotificationPreferences {
  userId: string;
  pushUrgent: boolean;
  pushAcademic: boolean;
  pushSystem: boolean;
  pushSocial: boolean;
  emailDigest: boolean;
}

/** A PUT carries the ONE changed field (the backend demands ≥1 boolean). */
type PreferenceChange = Partial<Omit<NotificationPreferences, "userId">>;
type PreferenceField = Exclude<keyof NotificationPreferences, "userId">;

const PREFS_KEY = ["notification-preferences"] as const;

/** The four push-category seats — labels mirror the inbox chips
 *  (notificationTypeLabel in features/notifications) so both surfaces
 *  name a category with the same word. */
const PUSH_CATEGORY_ROWS: { field: PreferenceField; testID: string; label: string; hint: string }[] = [
  { field: "pushUrgent", testID: "pref-push-URGENT", label: "عاجل", hint: "تنبيهات فورية مهمة" },
  { field: "pushAcademic", testID: "pref-push-ACADEMIC", label: "أكاديمي", hint: "محاضرات وواجبات ونتائج" },
  { field: "pushSystem", testID: "pref-push-SYSTEM", label: "النظام", hint: "إعلانات المنصة والتحديثات" },
  { field: "pushSocial", testID: "pref-push-SOCIAL", label: "اجتماعي", hint: "رسائل وتفاعلات المجتمع" },
];

export default function Settings() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const setSession = useSession((s) => s.setSession);
  const preference = useThemePreference();
  const qc = useQueryClient();
  const { numerals, setNumerals } = useNumerals();

  /* «ردود اللمس» — the persisted kill-switch, identical seat to Profile
     (isEnabled() is a synchronous cached read → lazy initialiser, no effect). */
  const [hapticsOn, setHapticsOn] = useState(() => haptics.isEnabled());
  const toggleHaptics = (next: boolean) => {
    haptics.setEnabled(next);
    setHapticsOn(next);
    if (next) haptics.impact("light"); // a felt sample of what was enabled
  };

  /* «أصوات الواجهة» — the persisted kill-switch, the haptics row's own
     seat. The set is quiet by construction and the OS silent switch
     mutes it on iOS regardless — this toggle is for people who want
     silence everywhere. Re-enabling plays the success blip as the
     audible sample of what was enabled (the same grammar as the
     haptics row's felt sample). */
  const [soundsOn, setSoundsOn] = useState(() => sound.isEnabled());
  const toggleSounds = (next: boolean) => {
    sound.setEnabled(next);
    setSoundsOn(next);
    if (next) sound.notify("success"); // an audible sample of what was enabled
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  /* R327 C3 — the biometric app-lock seat: the row only exists when the
   * device has hardware AND an enrolled biometric (web: never). Enabling
   * PROVES it first (one authenticate) before the flag is saved — a
   * toggle that never asked the sensor is a lock nobody tested. */
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  useEffect(() => {
    void biometricAvailable().then(setBioAvail);
    void getBiometricLockEnabled().then(setBioOn);
  }, []);
  const toggleBio = async (next: boolean) => {
    setBioBusy(true);
    try {
      if (next) {
        const ok = await authenticate("أكّد تفعيل قفل التطبيق");
        if (!ok) return; // refused → the toggle stays off
      }
      await setBiometricLockEnabled(next);
      setBioOn(next);
      toast.success(
        next ? "سيُطلب فتح القفل عند كل فتح بارد للتطبيق." : "أُلغي قفل التطبيق.",
        "الأمان",
      );
    } finally {
      setBioBusy(false);
    }
  };

  const themeOptions: { id: ThemePreference; label: string }[] = [
    { id: "light", label: "فاتح" },
    { id: "dark", label: "داكن" },
    { id: "system", label: "النظام" },
  ];

  const applyTheme = async (next: ThemePreference) => {
    setThemePreference(next);
    try {
      await put("/me/theme", { themePreference: next.toUpperCase() });
    } catch {
      // Local preference still applies; server sync is best-effort.
    }
  };

  const changeNumerals = (next: string) => {
    haptics.selection();
    setNumerals(next as typeof numerals);
  };

  /* r359 A4 — notification preferences: fetch on mount (60s stale, the
   * unread-count cadence); every toggle is OPTIMISTIC — the cache flips
   * at the tap, the PUT carries the single changed field, and a failure
   * rolls ONLY that field back + toasts (the switch never lies about
   * what the server accepted). */
  const prefs = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => get<NotificationPreferences>("/me/notification-preferences"),
    staleTime: 60_000,
  });
  const prefData = prefs.data ?? null;
  const savePref = useMutation({
    mutationFn: (change: PreferenceChange) => put<NotificationPreferences>("/me/notification-preferences", change),
    onMutate: (change) => {
      const prev = qc.getQueryData<NotificationPreferences>(PREFS_KEY) ?? null;
      if (prev) qc.setQueryData<NotificationPreferences>(PREFS_KEY, { ...prev, ...change });
      return { prev };
    },
    // Roll back ONLY the fields this mutation carried — a concurrent toggle
    // of another category keeps its optimistic state (a whole-snapshot
    // restore would clobber it).
    onError: (e, change, ctx) => {
      const prev = ctx?.prev ?? null;
      if (prev) {
        qc.setQueryData<NotificationPreferences>(PREFS_KEY, (old) => {
          if (!old) return prev;
          const restored: NotificationPreferences = { ...old };
          for (const field of Object.keys(change) as PreferenceField[]) restored[field] = prev[field];
          return restored;
        });
      }
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذّر حفظ التفضيل");
    },
    // No onSuccess cache write: the optimistic value already equals the
    // request, and a late server row could clobber a newer concurrent
    // toggle — the next mount's refetch reconciles.
  });
  const togglePref = (field: PreferenceField, next: boolean) => {
    haptics.selection();
    const change: PreferenceChange = { [field]: next };
    savePref.mutate(change);
  };

  const changePassword = async () => {
    setPwError(null);
    if (newPassword.length < 12 || newPassword.length > 72) {
      setPwError("كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا ولا تتجاوز 72.");
      return;
    }
    if (newPassword !== confirm) {
      setPwError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    try {
      const { data, refreshCookie } = await apiWithCookieCapture<SessionResponse>("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setSession(data.user, data.accessToken, refreshCookie);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      toast.success("تم تغيير كلمة المرور — انتهت جلسات أجهزتك الأخرى.", "كلمة المرور");
    } catch (err) {
      setPwError((err as ApiError).message ?? "تعذّر تغيير كلمة المرور.");
    } finally {
      setBusy(false);
    }
  };

  const themeLabel = user?.themePreference ? `الخادم: ${user.themePreference === "LIGHT" ? "فاتح" : user.themePreference === "DARK" ? "داكن" : "النظام"}` : "الخادم: —";

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <PageHeader title="الإعدادات" kicker="أُلارا" />

        {/* [01] التفضيلات — مظهرك وأرقامك وملمس التفاعل، مقاعد متطابقة مع الملف */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={1} title="التفضيلات" />
          <RowList>
            <LedgerRow>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Moon size={20} color={p.textMuted} />
                <T variant="body" weight="medium" style={{ flex: 1 }}>
                  المظهر
                </T>
                <T variant="sm" color="secondary">
                  {themeOptions.find((o) => o.id === preference)?.label ?? "—"}
                </T>
              </View>
              <Segmented
                options={themeOptions}
                selectedId={preference}
                onSelect={(id) => {
                  haptics.selection();
                  void applyTheme(id as ThemePreference);
                }}
              />
              <T variant="xs" color="faint">{themeLabel}</T>
            </LedgerRow>
            <LedgerRow>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Hash size={20} color={p.textMuted} />
                <T variant="body" weight="medium" style={{ flex: 1 }}>
                  الأرقام
                </T>
                <T variant="sm" color="secondary">
                  {numerals === "arabic-indic" ? "١٢٣" : "123"}
                </T>
              </View>
              <Segmented options={NUMERALS_OPTIONS} selectedId={numerals} onSelect={changeNumerals} />
              <T variant="xs" color="faint">
                طريقة عرض الأرقام في لوحتك ونتائجك — {`١٢٣`} بالخط العربي أو {`123`} باللاتيني.
              </T>
            </LedgerRow>
            <LedgerRow>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Vibrate size={20} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium">ردود اللمس</T>
                  <T variant="xs" color="muted">
                    اهتزاز خفيف عند التفاعلات الرئيسة — يعمل على الجوال فقط.
                  </T>
                </View>
                <Button
                  label={hapticsOn ? "إلغاء" : "تفعيل"}
                  kind={hapticsOn ? "ghost" : "primary"}
                  small
                  onPress={() => toggleHaptics(!hapticsOn)}
                />
              </View>
            </LedgerRow>
            <LedgerRow last>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Volume2 size={20} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium">أصوات الواجهة</T>
                  <T variant="xs" color="muted">
                    نغمات قصيرة هادئة عند نجاح العمليات أو فشلها — تحترم مفتاح الصمت.
                  </T>
                </View>
                <Button
                  label={soundsOn ? "إلغاء" : "تفعيل"}
                  kind={soundsOn ? "ghost" : "primary"}
                  small
                  onPress={() => toggleSounds(!soundsOn)}
                />
              </View>
            </LedgerRow>
          </RowList>
        </View>

        {/* [02] الحساب — الهويّة والحقائق كما تقرؤها الخدمة الآن */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={2} title="الحساب" />
          <RowList>
            <LedgerRow>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    {user ? `${user.firstName} ${user.lastName}` : "—"}
                  </T>
                  <T variant="sm" color="muted">
                    {user?.email}
                  </T>
                </View>
                {user ? <Badge label={ROLE_LABELS[user.role] ?? user.role} tone="sky" /> : null}
              </View>
            </LedgerRow>
            <FactRow label="المؤسّسة الحالية" value={user?.currentInstitution?.name ?? "—"} />
            <FactRow
              label="نطاق العمل"
              value={user?.scopeFaculty ? `كلية ${user.scopeFaculty.name}` : user?.scopeFacultyId ? "كلية محددة" : "على مستوى الجامعة"}
            />
            {user?.teacherProfile?.position ? (
              <FactRow
                label="المنصب الأكاديمي"
                value={`${POSITION_LABELS[user.teacherProfile.position] ?? user.teacherProfile.position}${
                  user.teacherProfile.positionFaculty ? ` — ${user.teacherProfile.positionFaculty.name}` : ""
                }`}
              />
            ) : null}
            {user?.teacherProfile?.rank ? (
              <FactRow label="الرتبة" value={RANK_LABELS[user.teacherProfile.rank] ?? user.teacherProfile.rank} />
            ) : null}
            <FactRow
              last
              label="العضويات"
              value={(user?.memberships ?? []).map((m) => `${m.name} (${ROLE_LABELS[m.role] ?? m.role})`).join(" · ") || "—"}
            />
          </RowList>
        </View>

        {/* [03] الأمان — قفل التطبيق وكلمة المرور في مقعد واحد */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={3} title="الأمان" />
          <RowList>
            {bioAvail ? (
              <LedgerRow last>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <Fingerprint size={20} color={p.textMuted} />
                  <View style={{ flex: 1 }}>
                    <T variant="body" weight="medium">قفل التطبيق بالبصمة</T>
                    <T variant="xs" color="muted">
                      عند التفعيل، يُطلب فتح القفل عند كل فتح بارد للتطبيق قبل عرض أي بيانات — مع رمز الجهاز كبديل دائمًا.
                    </T>
                  </View>
                  <Button
                    label={bioBusy ? "…" : bioOn ? "إلغاء" : "تفعيل"}
                    kind={bioOn ? "ghost" : "primary"}
                    small
                    disabled={bioBusy}
                    onPress={() => void toggleBio(!bioOn)}
                  />
                </View>
              </LedgerRow>
            ) : (
              <LedgerRow last>
                <T variant="sm" color="muted">
                  قفل التطبيق بالبصمة متاح على الأجهزة المزوّدة بمستشعر بصمة أو تعرّف على الوجه — جهازك الحالي لا يوفّره (أو لم تُسجّل بصمة في النظام).
                </T>
              </LedgerRow>
            )}
          </RowList>
          <Card style={{ gap: sp[10] }}>
            <Field label="كلمة المرور الحالية" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCorrect={false} />
            <SecretField label="كلمة المرور الجديدة" value={newPassword} onChangeText={setNewPassword} hint="12 حرفًا على الأقل." />
            <SecretField label="تأكيد كلمة المرور الجديدة" value={confirm} onChangeText={setConfirm} onSubmitEditing={changePassword} />
            {pwError ? <T variant="sm" color="danger">{pwError}</T> : null}
            <T variant="xs" color="faint">
              تغيير كلمة المرور ينهي جلساتك على جميع الأجهزة الأخرى.
            </T>
            <Button label={busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"} onPress={changePassword} loading={busy} />
          </Card>
        </View>

        {/* [04] الدعم — R331 A-App-Shell: the report loop entry for EVERY
            role (student & teacher carry it in their Profile menus;
            admin/quality/owner reach it here). Replaces the removed
            floating feedback FAB. */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={4} title="الدعم" />
          <RowList>
            <LedgerRow
              last
              onPress={() => {
                haptics.selection();
                router.push("/report");
              }}
              accessibilityLabel="الإبلاغ عن مشكلة"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Flag size={20} color={p.textMuted} />
                <T variant="body" weight="medium" style={{ flex: 1 }}>
                  الإبلاغ عن مشكلة
                </T>
              </View>
            </LedgerRow>
          </RowList>
        </View>

        {/* [05] الجلسة — الخروج */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={5} title="الجلسة" />
          <Button
            label="تسجيل الخروج"
            kind="danger"
            onPress={() => {
              haptics.notify("warning");
              setConfirmLogout(true);
            }}
          />
        </View>

        {/* [06] الإشعارات — r359 A4: مقاعد تفضيل الفئات الأربع + الملخّص
            الأسبوعي (اختياري، معطّل افتراضيًا) — لكل مستخدم مسجّل الدخول،
            التبديل متفائل مع تراجع عند الفشل. */}
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={6} title="الإشعارات" />
          <T variant="xs" color="muted">
            تنبيهات جهازك مقسّمة إلى أربع فئات — والملخّص الأسبوعي بالبريد خدمة اختيارية.
          </T>
          {prefs.isLoading ? (
            <SkeletonList rows={5} rowHeight={48} />
          ) : prefs.isError ? (
            <ErrorState compact message={humanizeError(prefs.error)} onRetry={() => prefs.refetch()} />
          ) : prefData ? (
            <RowList>
              {PUSH_CATEGORY_ROWS.map((row) => (
                <PrefRow
                  key={row.field}
                  label={row.label}
                  hint={row.hint}
                  testID={row.testID}
                  value={prefData[row.field]}
                  onToggle={(next) => togglePref(row.field, next)}
                />
              ))}
              <PrefRow
                last
                label="الملخّص الأسبوعي بالبريد"
                hint="رسالة أسبوعية بأهم إشعاراتك غير المقروءة"
                testID="pref-email-digest"
                value={prefData.emailDigest}
                onToggle={(next) => togglePref("emailDigest", next)}
              />
            </RowList>
          ) : null}
        </View>
        <T variant="xs" color="faint" style={{ textAlign: "center" }}>
          أُلارا موبايل {Constants.expoConfig?.version ?? "1.0.0"} — Expo SDK {Constants.expoConfig?.sdkVersion ?? "58"}
        </T>
      </Screen>

      {/* Same destructive ConfirmSheet as the student Profile — one
          confirmation pattern for logout across the app. A SIBLING of the
          scroller, never scroll content: the sheet mounts its own
          absolute-fill host, which must live in the screen root's
          coordinate space or it never presents on Android (r341 t01). */}
      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="تسجيل الخروج؟"
        message="ستنتهي جلستك على هذا الجهاز فقط — تُحفظ جلسات أجهزتك الأخرى."
        confirmLabel="خروج"
        destructive
        onConfirm={async () => {
          setConfirmLogout(false);
          // R327 C3 — a handed-over phone must not keep pushing.
          await unregisterPushDevices().catch(() => undefined);
          await logout();
          qc.clear();
          router.replace("/");
        }}
      />
    </View>
  );
}

/** Group header — the muted wayfinding tier of the settings sheet: mono
 *  [nn] index + small muted title over a hairline. Deliberately quieter
 *  than the rows it labels (the measured hierarchy: rows carry the ink,
 *  headers only wayfind), one rung under the page title. */
function GroupHeader({ index, title }: { index: number; title: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: sp[8],
        paddingBottom: sp[6],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.border,
      }}
    >
      <MonoLabel>{`[${String(index).padStart(2, "0")}]`}</MonoLabel>
      <T variant="sm" weight="medium" color="muted">
        {title}
      </T>
    </View>
  );
}

/** Fact row — a read-only account fact on the ledger rhythm: muted label
 *  above the ink value (stacked so long Arabic values — العضويات، النطاق —
 *  wrap instead of squeezing the label). */
function FactRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <LedgerRow last={last}>
      <T variant="sm" color="muted">
        {label}
      </T>
      <T variant="body" weight="medium">
        {value}
      </T>
    </LedgerRow>
  );
}

/** Preference row — one ledger seat with a Switch (the app's first RN
 *  Switch: royal track when on, palette tokens only). The native frame is
 *  ~31px tall, so the 44px touch floor lives on an accessible Pressable
 *  wrapper that owns the switch ROLE, STATE, LABEL and testID; the Switch
 *  renders the visual state only (pointerEvents off + a11y-hidden — one
 *  touch path and one accessibility target, never a double toggle). */
function PrefRow({
  label,
  hint,
  value,
  testID,
  onToggle,
  last,
}: {
  label: string;
  hint: string;
  value: boolean;
  testID: string;
  onToggle: (next: boolean) => void;
  last?: boolean;
}) {
  const p = usePalette();
  return (
    <LedgerRow last={last}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="medium">
            {label}
          </T>
          <T variant="xs" color="muted">
            {hint}
          </T>
        </View>
        <Pressable
          accessible
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: value }}
          testID={testID}
          onPress={() => onToggle(!value)}
          style={({ pressed }) => [{ minHeight: touchFloor, minWidth: touchFloor, alignItems: "center", justifyContent: "center" }, pressed && { opacity: pressFeedback.linkOpacity }]}
        >
          <Switch
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: p.border, true: p.accent }}
            thumbColor={p.surface}
          />
        </Pressable>
      </View>
    </LedgerRow>
  );
}
