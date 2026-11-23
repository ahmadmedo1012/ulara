import { View } from "react-native";
import { router, Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";
import { EmptyState } from "@/components/ui/states";
import { T } from "@/components/ui/text";
import { useTheme } from "@/design/theme";
import { ds, sp } from "@/design/tokens";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";

/**
 * /institution — r353: the Institutional Operating Workspace's mobile
 * home (web InstitutionWorkspaceLayout parity): ONE stack under the
 * platform role shell. The workspace is the institution's own
 * structure/people/governance/programs/compliance/facilities/research
 * surface — reachable for ADMIN, QUALITY and OWNER (the WEB route
 * gate is the sanctioned product reference — App.tsx:
 * ProtectedRoute allow={['ADMIN','OWNER','QUALITY']}; the API
 * contract's §0 "any active member" language describes the server's
 * read scoping, not a wider product gate. Mobile matches the web
 * gate byte-for-byte; write affordances inside gate by the server's
 * effective capability set, never role names).
 *
 * R353-2 §6 — the no-context state: an allowed role WITHOUT an
 * institution context (zero active memberships) gets the honest
 * «اختر مؤسستك» state — not an eternal skeleton behind disabled
 * queries, and never copy that blames the institution's data. A
 * member with active memberships but no selection is routed to
 * /select-institution by the RoleGate above.
 */
function InstitutionContextGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useSession((s) => s.isHydrated);
  const user = useSession((s) => s.user);
  const scope = useInstitutionScope();

  if (!isHydrated || scope !== null) return <>{children}</>;

  const active = (user?.memberships ?? []).filter((m) => m.isActive);
  if (active.length > 0) {
    // The RoleGate is routing to /select-institution; render nothing
    // meanwhile (no flash of the no-membership state).
    return null;
  }

  const isOwner = user?.role === "OWNER";
  return (
    <View style={{ flex: 1, padding: sp[16], gap: sp[12] }}>
      <EmptyState
        title="لم تُحدَّد مؤسسة في هذه الجلسة"
        message={
          isOwner
            ? "مساحة العمل المؤسسية تعمل داخل سياق مؤسسة — افتح وحدة المالك واختر مؤسسة، أو اخترها من مبدّل المؤسسة."
            : "عضويتك لا تشمل مؤسسة نشطة حالياً — لا يمكن عرض هيكل أو كوادر أو حوكمة بلا مؤسسة. اختر مؤسستك أو تواصل مع إدارة منصتك."
        }
        actionLabel={isOwner ? "وحدة المالك" : "اختيار المؤسسة"}
        onAction={() => router.replace((isOwner ? "/owner/dashboard" : "/select-institution") as never)}
      />
      <T variant="xs" color="faint">
        الدور مسموح، لكن لا سياق مؤسسة — هذا يختلف عن «مؤسسة فارغة».
      </T>
    </View>
  );
}

export default function InstitutionLayout() {
  const { name } = useTheme();
  return (
    <RoleGate allow={["ADMIN", "QUALITY", "OWNER"]}>
      <InstitutionContextGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: ds[name].bg },
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" />
        </Stack>
      </InstitutionContextGate>
    </RoleGate>
  );
}
