"use client";

import { useThemeContext } from "@/components/theme-provider";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useThemeContext();
  
  return {
    theme,
    setTheme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
  };
}
