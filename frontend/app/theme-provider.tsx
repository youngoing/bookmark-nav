"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { themePreferencesResponse, type JsonValue } from "@loomark/shared";
import { DEFAULT_THEME_ID, getThemeCssVariables, getThemePreset, type ThemeId, type ThemeMode } from "./theme-config";

export type { ThemeId, ThemeMode } from "./theme-config";
type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  refreshPreferences: () => Promise<void>;
};
const MODE_STORAGE_KEY = "loomark-theme-mode";
const THEME_STORAGE_KEY = "loomark-theme-id";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const setThemeMode = useCallback((nextMode: ThemeMode): void => {
    setMode(nextMode);
  }, []);

  const refreshPreferences = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/v1/preferences", {
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);
    if (!response || !response.ok) {
      setRemoteEnabled(false);
      return;
    }
    const body = await response.json().then((value) => value as JsonValue).catch(() => null);
    if (body === null) {
      setRemoteEnabled(false);
      return;
    }
    const parsed = themePreferencesResponse.safeParse(body);
    if (!parsed.success) {
      setRemoteEnabled(false);
      return;
    }
    setThemeId(parsed.data.themeId);
    setThemeMode(parsed.data.themeMode);
    setRemoteEnabled(true);
  }, [setThemeMode]);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (getThemePreset(storedTheme).id === storedTheme) setThemeId(storedTheme as ThemeId);
    if (isThemeMode(storedMode)) setThemeMode(storedMode);
    void refreshPreferences();
  }, [refreshPreferences, setThemeMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "light";
    const baseTheme = themeId === "default" || themeId === "midnight";
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    const applyTheme = () => {
      const currentSystemDark = mode === "system" && Boolean(media?.matches);
      const currentThemeId = baseTheme
        ? mode === "dark" || (mode === "system" && currentSystemDark)
          ? "midnight"
          : "default"
        : themeId;
      const currentTheme = getThemePreset(currentThemeId);
      root.dataset.themePreset = currentTheme.id;
      root.removeAttribute("data-theme-id");
      root.style.colorScheme = currentTheme.mode;
      for (const [name, value] of Object.entries(getThemeCssVariables(currentTheme))) {
        root.style.setProperty(name, value);
      }
    };
    applyTheme();
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    if (mode !== "system" || !baseTheme || !media) return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [mode, themeId]);

  useEffect(() => {
    if (!remoteEnabled) return;
    void fetch("/api/v1/preferences", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ themeId, themeMode: mode }),
    });
  }, [mode, remoteEnabled, themeId]);

  return <ThemeContext.Provider value={{ mode, setMode: setThemeMode, themeId, setThemeId, refreshPreferences }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
