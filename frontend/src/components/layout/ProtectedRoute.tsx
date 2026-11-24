import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { toast } from '../../lib/toast';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { ROLE_HOME } from '../../lib/roleHome';


/* r360 F1 — ProtectedRoute moved OUT of AppShell.tsx (its birth file).
 * App.tsx needs this guard statically on every route branch, but the
 * AppShell component it shared a file with drags the entire
 * authenticated shell tree (Sidebar/Topbar/BottomNav/CommandPalette/
 * onboarding/feedback + nav's lucide icons) into the ENTRY chunk —
 * ~110KB of code the public routes (landing, auth, guest colleges)
 * never mount. App.tsx now lazy-imports AppShell; this file keeps
 * only the guard's own small closure. The guard's behavior is
 * byte-identical to the AppShell.tsx original (the same hydration
 * window, the same denied-role notice, the same navigation). */

const DENIED_ROLE_MESSAGE = 'هذه الصفحة غير متاحة لدور حسابك — أُعيدك إلى لوحتك'; /* the AppShell.tsx original's own wording (byte-identical) */

function DeniedRoleNotice() {
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    toast.info(DENIED_ROLE_MESSAGE);
  }, []);
  return null;
}

export function ProtectedRoute({ allow }: { allow?: AppRole[] }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  /* R323 §A2 foreman integration: the app-root boot Splash owns the
   * pre-hydration window (a fullscreen orchestrator layer from first
   * paint) — rendering the legacy HydrationSplash here as well put a
   * SECOND logo on screen at boot, the exact overlap the
   * r323-loader-overlap e2e pin exists to catch. null is invisible
   * under the splash; the store decides the instant it rehydrates. */
  if (!isHydrated) return null;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    return (
      <>
        <DeniedRoleNotice />
        <Navigate to={ROLE_HOME[user.role]} replace state={{ deniedFrom: location.pathname }} />
      </>
    );
  }
  return <Outlet />;
}
