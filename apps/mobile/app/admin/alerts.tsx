import { router } from "expo-router";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/**
 * Pushed: /admin/alerts — the registrar's personal notifications inbox
 * (the bell target from the AppTopBar). `stacked` seats the back affordance
 * + the bottom home-indicator inset (the teacher pattern — teacher/alerts).
 */
export default function Alerts() {
  return (
    <NotificationsScreen
      title="الإشعارات"
      kicker="بريدك"
      stacked
      onBack={() => router.back()}
    />
  );
}
