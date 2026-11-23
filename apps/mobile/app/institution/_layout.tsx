import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";
import { useTheme } from "@/design/theme";
import { ds } from "@/design/tokens";

/**
 * /institution — r353: the Institutional Operating Workspace's mobile
 * home (web InstitutionWorkspaceLayout parity): ONE stack under the
 * platform role shell. The workspace is the institution's own
 * structure/people/governance/programs/compliance/facilities/research
 * surface — reachable for ADMIN, QUALITY and OWNER (institution reads
 * are context reads per contract §0; write affordances inside gate by
 * the server's effective capability set, never role names).
 *
 * The bar hides naturally for the pushed section screens; back returns
 * to the living overview.
 */
export default function InstitutionLayout() {
  const { name } = useTheme();
  return (
    <RoleGate allow={["ADMIN", "QUALITY", "OWNER"]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: ds[name].bg },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </RoleGate>
  );
}
