import { useEffect, type ReactNode } from "react";
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
 */
export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const isHydrated = useSession((s) => s.isHydrated);
  const sessionEpoch = useSession((s) => s.sessionEpoch);

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
      if (active.length > 0) {
        router.replace("/select-institution");
      }
    }
  }, [isHydrated, user, allow, sessionEpoch]);

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
