/**
 * r326 M0.7 → r359 A4 — the update experience (release-by-new-build).
 *
 * EAS OTA is RETIRED (owner contract, r359): JS never hot-swaps in the
 * field; every fix ships as a NEW NATIVE BUILD from the GitHub Actions
 * lanes. What remains here is the server-driven version story:
 *
 * 1. New-version toast: on cold start and on foreground (throttled),
 *    GET /status carries { latestAppVersion, updateUrl }. When the
 *    running appVersion < latestAppVersion we show ONE non-blocking
 *    toast «يتوفر إصدار جديد» that opens the download page.
 * 2. Min-version gate: GET /status carries { minAppVersion, updateUrl }.
 *    When the running appVersion < minAppVersion the caller must render
 *    the blocking «يلزم تحديث التطبيق» screen (BlockingUpdateGate) —
 *    nothing else in the app runs below the floor.
 *
 * Everything here is fire-and-forget safe: a failed check NEVER breaks
 * the app (offline, airplane mode, cold server — all just skip).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { toast } from "@/components/ui/toast";
import { crumb, reportClientError } from "@/lib/telemetry";
import { themeFor } from "@/design/theme";

const STATUS_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  "https://ulara.vercel.app/api/v1";

function appSemver(): string {
  return (
    Constants.expoConfig?.version ??
    (Constants.manifest as { version?: string } | undefined)?.version ??
    "0.0.0"
  );
}

/** semver a.b.c comparison: -1 | 0 | 1 (tolerant of missing parts). */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x) || 0);
  const pb = b.split(".").map((x) => Number(x) || 0);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/* ── the new-build half ─────────────────────────────────────────────── */

interface StatusVersionShape {
  minAppVersion?: string | null;
  latestAppVersion?: string | null;
  updateUrl?: string | null;
}

async function fetchStatusVersions(signal: AbortSignal): Promise<StatusVersionShape | null> {
  const res = await fetch(`${STATUS_URL}/status`, { signal });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: StatusVersionShape };
  return body.data ?? null;
}

/** Cold-start + foreground (throttled) check: shows ONE toast when a
 * newer build is published. Non-blocking by design — the floor is the
 * min-version gate below, not this. */
export function useAppUpdates(): void {
  const lastCheck = useRef(0);
  const announced = useRef(false);
  const check = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheck.current < 15_000) return;
    lastCheck.current = now;
    if (__DEV__) return; // dev never nags about published builds
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const v = await fetchStatusVersions(ctrl.signal);
      const latest = v?.latestAppVersion ?? null;
      if (v && latest && compareSemver(appSemver(), latest) < 0 && !announced.current) {
        announced.current = true; // once per app session, ever
        crumb(`update: new build published (app ${appSemver()} < latest ${latest})`);
        toast.info("يتوفر إصدار جديد من أُلارا — حمّله من صفحة التطبيق", "تحديث أُلارا");
      }
    } catch {
      /* offline / cold server — never break the app */
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Record the running build in the telemetry context (crash reports
 * carry the exact native version — there is no OTA layer anymore). */
export function updateStamp(): string {
  return `build v${appSemver()}`;
}

/* ── the min-version gate half ──────────────────────────────────────── */

export interface VersionGate {
  status: "checking" | "ok" | "blocked";
  updateUrl: string;
}

export function useVersionGate(): VersionGate {
  const [gate, setGate] = useState<VersionGate>({ status: "checking", updateUrl: "" });

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    (async () => {
      try {
        const v = await fetchStatusVersions(ctrl.signal);
        clearTimeout(timer);
        const min = v?.minAppVersion ?? null;
        const updateUrl = v?.updateUrl ?? "https://ulara.vercel.app/app";
        if (cancelled) return;
        if (min && compareSemver(appSemver(), min) < 0) {
          crumb(`version gate: BLOCKED (app ${appSemver()} < min ${min})`);
          setGate({ status: "blocked", updateUrl });
        } else {
          setGate({ status: "ok", updateUrl });
        }
      } catch {
        clearTimeout(timer);
        // Status unreachable (offline / cold server): NEVER block the app
        // on a failed check — the gate is server-issued policy, not a
        // local guess.
        if (!cancelled) setGate({ status: "ok", updateUrl: "" });
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
    };
     
  }, []);

  return gate;
}

/** The blocking «يلزم تحديث التطبيق» screen — rendered instead of the
 *  navigator when the running version is below the server floor. */
export function BlockingUpdateGate({ updateUrl }: { updateUrl: string }) {
  const p = themeFor("light").palette;
  const open = useCallback(() => {
    if (updateUrl) void Linking.openURL(updateUrl).catch(() => undefined);
  }, [updateUrl]);
  useEffect(() => {
    void reportClientError({
      kind: "js_error",
      message: `version gate: blocked at v${appSemver()}`,
    });
     
  }, []);
  return (
    <View style={[styles.fill, { backgroundColor: p.bg }]}>
      <View style={styles.content}>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
        <Text style={[styles.title, { color: p.text }]}>يلزم تحديث التطبيق</Text>
        <Text style={[styles.body, { color: p.textSecondary }]}>
          هذا الإصدار لم يعد مدعومًا. حمّل الإصدار الجديد من صفحة التطبيق ثم عُد —
          بياناتك محفوظة على الخادم ولن تفقد شيئًا.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تحميل التحديث"
          onPress={open}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? p.accentHover : p.accent },
          ]}
        >
          {({ pressed }) => (
            /* pressed label: the #4C63F0 night press fill takes the WHITE
             * hover label (4.83:1 — accentHoverFg), not the resting #262019. */
            <Text style={[styles.buttonText, { color: pressed ? p.accentHoverFg : p.accentFg }]}>
              تحميل التحديث
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  rule: { alignSelf: "flex-end", width: 56, height: 3 },
  title: { fontFamily: "Body-SemiBold", fontSize: 24, writingDirection: "rtl", textAlign: "right" },
  body: { fontFamily: "Body-Regular", fontSize: 15, lineHeight: 24, writingDirection: "rtl", textAlign: "right" },
  button: { alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12, minWidth: 160, alignItems: "center" },
  buttonText: { fontFamily: "Body-SemiBold", fontSize: 15 },
});
