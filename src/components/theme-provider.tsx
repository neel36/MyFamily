"use client";

import * as React from "react";
import { db } from "@/database";
import Dexie from "dexie";
import { getAppConfig } from "@/database/config";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [mounted, setMounted] = React.useState(false);

  // Helper to determine system theme
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const resolvedTheme: "light" | "dark" = React.useMemo(() => {
    if (theme === "system") {
      return getSystemTheme();
    }
    return theme;
  }, [theme]);

  // Apply theme to the document element
  const applyTheme = React.useCallback((activeTheme: Theme) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const resolved = activeTheme === "system" 
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : activeTheme;

    root.classList.add(resolved);
  }, []);

  // Read theme from IndexedDB on mount
  React.useEffect(() => {
    const loadTheme = async () => {
      try {
        const appConfig = await getAppConfig();
        const themeSetting = await db.settings.get("theme");
        const preferredTheme = (themeSetting?.value as Theme | undefined) || appConfig.defaultTheme || "system";
        if (preferredTheme === "light" || preferredTheme === "dark" || preferredTheme === "system") {
          setThemeState(preferredTheme as Theme);
          applyTheme(preferredTheme as Theme);
        } else {
          // Attempt to migrate from old database "MyFamilyDatabase"
          let migratedTheme: Theme | null = null;
          try {
            const oldDbExists = await Dexie.exists("MyFamilyDatabase");
            if (oldDbExists) {
              const oldDb = new Dexie("MyFamilyDatabase");
              await oldDb.open();
              const oldSettingsTable = oldDb.table("settings");
              if (oldSettingsTable) {
                const oldTheme = await oldSettingsTable.get("theme");
                if (oldTheme && (oldTheme.value === "light" || oldTheme.value === "dark" || oldTheme.value === "system")) {
                  migratedTheme = oldTheme.value as Theme;
                }
              }
              oldDb.close();
            }
          } catch (e) {
            console.warn("Could not check or migrate from old MyFamilyDatabase:", e);
          }

          const targetTheme: Theme = migratedTheme || (appConfig.defaultTheme as Theme) || "system";
          // Default to system or migrated value
          await db.settings.put({ key: "theme", value: targetTheme });
          setThemeState(targetTheme);
          applyTheme(targetTheme);
        }
      } catch (error) {
        console.error("Failed to load theme from IndexedDB:", error);
      } finally {
        setMounted(true);
      }
    };

    loadTheme();
  }, [applyTheme]);

  // Listen to system theme changes when theme is "system"
  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      applyTheme("system");
    };

    // Use modern or fallback listener API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme, applyTheme]);

  const setTheme = async (newTheme: Theme) => {
    try {
      await db.settings.put({ key: "theme", value: newTheme });
      setThemeState(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme to IndexedDB:", error);
    }
  };

  // Prevent hydration flash/mismatch by rendering transparently or fallback layout
  // until theme is loaded from client database
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }} className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
