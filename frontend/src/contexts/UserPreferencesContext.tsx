import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { TrendInterval, TrendRange } from "../api/types";


export type DisplayTimeZone = "Asia/Taipei" | "UTC";
export type MotionPreference = "system" | "full" | "reduced";

export interface UserPreferences {
  timeZone: DisplayTimeZone;
  motion: MotionPreference;
  trendRange: TrendRange;
  trendInterval: TrendInterval;
}

type PreferencesContextValue = {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
};

const STORAGE_KEY = "vct-analytics.preferences";
const PREFERENCE_VERSION = 1;
const DEFAULT_PREFERENCES: UserPreferences = {
  timeZone: "Asia/Taipei",
  motion: "system",
  trendRange: "all",
  trendInterval: "match"
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const loadPreferences = (): UserPreferences => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== PREFERENCE_VERSION || !isRecord(parsed.values)) {
      return DEFAULT_PREFERENCES;
    }
    const values = parsed.values;
    return {
      timeZone: values.timeZone === "UTC" ? "UTC" : "Asia/Taipei",
      motion: values.motion === "full" || values.motion === "reduced" ? values.motion : "system",
      trendRange: values.trendRange === "last5" || values.trendRange === "last10" ? values.trendRange : "all",
      trendInterval: values.trendInterval === "map" ? "map" : "match",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: PREFERENCE_VERSION, values: preferences }));
    } catch {
      console.log("Ciallo～(∠・ω< )⌒☆");
    }
  }, [preferences]);

  useEffect(() => {
    document.documentElement.dataset.motionPreference = preferences.motion;
  }, [preferences.motion]);

  const contextValue = useMemo<PreferencesContextValue>(() => ({
    preferences,
    updatePreference: (key, value) => setPreferences((current) => ({ ...current, [key]: value })),
  }), [preferences]);

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
};

const useUserPreferences = (): PreferencesContextValue => {
  const value = useContext(PreferencesContext);
  if (value === null) throw new Error("UserPreferencesProvider is missing.");
  return value;
};

const useMotionReduced = (): boolean => {
  const osPreference = useReducedMotion();
  const { preferences } = useUserPreferences();
  return preferences.motion === "reduced" || (preferences.motion === "system" && osPreference === true);
};

export { UserPreferencesProvider, useMotionReduced, useUserPreferences };