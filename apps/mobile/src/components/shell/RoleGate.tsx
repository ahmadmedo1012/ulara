import { useEffect, useRef, type ReactNode } from "react";
import { router } from "expo-router";
import { useSession, ROLE_HOME } from "@/auth/session";
import { toast } from "@/components/ui/toast";
import { LoadingScreen } from "@/components/ui/states";
import { LaunchSheet } from "@/components/ui/brand";
import type { AppRole } from "@/api/types";

/**
 * RoleGate — ProtectedRoute parity (AppShell.tsx):
 *  - unauthenticated → /auth (preserving intent via ?continue=)
 *  - authenticated without institution context (multi-membership) → picker
 *  - wrong role → toast «هذه الصفحة غير متاحة لدور حسابك» + role-home bounce.
 *
 * R336 A3: ALL navigation lives in the effect. The old branch called
 * router.replace("/auth") DURING RENDER — a side effect in the render
 * body that React can warn about, re-run on every commit, and (if the
 * replace is swallowed) leaves the user parked on the LaunchSheet
 * placeholder with no navigation actually happening. The render body is
 * now pure: it only decides what to PAINT while the effect navigates.
 *
 * r367 (the soak's verdict, run 45814979882): a network-chaos round (or a
 * cold start whose /me hasn't resolved yet) can surface a user whose
 * `currentInstitution` is null while the LAST-SELECTED institution id
 * still sits in the persisted session — the old gate dumped every such
 * moment onto the picker, whose memberships load then raced the refresh
 * path and showed the error card (the dashboard the assert — and the
 * user — expected never came back). The gate now AUTO-RESTORES the
 * last selection when it is still among the user's ACTIVE memberships:
 * one guarded selectInstitution() call re-resolves the session to the
 * workspace dashboard; the picker remains the destination for genuine
 * first-time picks (no stored id) and for selections that are no longer
 * active. The restore is in-flight-guarded per epoch (a chaos round may
 * re-enter the effect several times; the call must fire once).
 */
export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const isHydrated = useSession((s) => s.isHydrated);
  const sessionEpoch = useSession((s) => s.sessionEpoch);
  const activeInstitutionId = useSession((s) => s.activeInstitutionId);
  const selectInstitution = useSession((s) => s.selectInstitution);
  const restoringRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (!allow.includes(user.role)) {
      toast.error("هذه الصفحة غير متاحة لدور حسابك — أُعيدك إلى لوحتك.");
      router.replace((ROLE_HOME[user.role] ?? "/student/dashboard") as never);
      return;
    }
    if (!user.currentInstitution && user.role !== "OWNER") {
      const active = (user.memberships ?? []).filter((m) => m.isActive);
      /* the r367 auto-restore: the persisted last selection, still an
       * active membership — restore it instead of the picker. */
      if (
        activeInstitutionId &&
        !restoringRef.current &&
        active.some((m) => m.institutionId === activeInstitutionId)
      ) {
        restoringRef.current = activeInstitutionId;
        selectInstitution(activeInstitutionId)
          .then(() => {
            restoringRef.current = null;
            /* the session re-resolved with currentInstitution set —
             * nothing to navigate: the effect re-runs on the new user
             * and the workspace renders in place. */
          })
          .catch(() => {
            restoringRef.current = null;
            /* offline/failed restore → the honest picker (with its own
             * retry card), exactly the pre-r367 destination. */
            router.replace("/select-institution");
          });
        return;
      }
      if (active.length > 0) {
        router.replace("/select-institution");
      }
    }
  }, [isHydrated, user, allow, sessionEpoch, activeInstitutionId, selectInstitution]);

  if (!isHydrated) {
    return <LoadingScreen label="جارٍ تهيئة الجلسة…" />;
  }
  if (!user) {
    return <LaunchSheet label="أُلارا" />;
  }
  if (!allow.includes(user.role)) {
    return <LaunchSheet label="أُلارا" />;
  }
  return <>{children}</>;
}
