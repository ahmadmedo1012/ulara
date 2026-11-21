import { createContext, useEffect, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ds, statusTones, type DsPalette, type StatusTone, type StatusToneName, type ThemeName } from "./tokens";
import { semanticThemeFor, type SemanticTheme } from "./semantic";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /**
   * True once the persisted preference has been read from storage (fires
   * on success AND on a storage error — hydration must never wedge the
   * boot). The splash handoff waits on this (app/_layout.tsx): without it,
   * a dark-preference user sees one or more light-paper Boot frames after
   * the dark native splash — a theme flash at the exact moment the eye is
   * watching the handoff.
   */
  hasHydrated: boolean;
}

const useThemeStore = create(
  persist<ThemeState>(
    (set) => ({
      preference: "light",
      hasHydrated: false,
      setPreference: (preference) => set({ preference }),
    }),
    {
      // The ula-mobile-theme key is the ONLY spelling (the retired
      // pre-ULARA fallback was removed — dev-phase installs re-choose once).
      name: "ula-mobile-theme",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        // Fires after the rehydration attempt regardless of outcome; the
        // partial state may be undefined on a cold store — flip the flag
        // either way so the boot gate always opens.
        if (error) console.warn("theme store rehydrate failed", error);
        useThemeStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/** True once the persisted theme preference has been restored. */
export function useThemeHydrated(): boolean {
  return useThemeStore((s) => s.hasHydrated);
}

export function useThemePreference(): ThemePreference {
  return useThemeStore((s) => s.preference);
}

export function setThemePreference(p: ThemePreference) {
  useThemeStore.getState().setPreference(p);
}

/** Effective theme for the current preference + device scheme. */
export function useTheme(): {
  name: ThemeName;
  palette: DsPalette;
  tones: Record<StatusToneName, StatusTone>;
  /** R334 2-f — additive: the semantic seat layer (never breaks consumers). */
  semantic: SemanticTheme;
} {
  const preference = useThemePreference();
  const system = useColorScheme();
  const name: ThemeName = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  return useMemo(
    () => ({ name, palette: ds[name], tones: statusTones[name], semantic: semanticThemeFor(name) }),
    [name],
  );
}

export function themeFor(name: ThemeName) {
  return { name, palette: ds[name], tones: statusTones[name], semantic: semanticThemeFor(name) };
}

/** Palette as a StyleSheet-compatible flat object (for non-hook contexts). */
export function usePalette(): DsPalette {
  return useTheme().palette;
}

export function useStatusTones(): Record<StatusToneName, StatusTone> {
  return useTheme().tones;
}

/** R334 2-f — the semantic color layer (surface/elevated/sunken seats,
 *  hairline presets, THE accent, status triples) resolved for the
 *  effective theme. See ./semantic + docs/mobile/foundations/theming.md. */
export function useSemanticTheme(): SemanticTheme {
  return useTheme().semantic;
}

export interface ThemeContextValue {
  name: ThemeName;
}

export const ThemeContext = createContext<ThemeContextValue>({ name: "light" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { name } = useTheme();
  const value = useMemo(() => ({ name }), [name]);
  useEffect(() => {
    const el = globalThis.document?.documentElement;
    if (el) {
      el.setAttribute("dir", "rtl");
      el.setAttribute("lang", "ar");
      el.setAttribute("data-theme", name);
    }
  }, [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
