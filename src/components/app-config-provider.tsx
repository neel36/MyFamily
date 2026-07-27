"use client";

import * as React from "react";
import { getAppConfig } from "@/database/config";
import { AppConfig, appConfigDefaults } from "@/types/schema";

interface AppConfigContextValue {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  refreshConfig: () => Promise<void>;
}

const AppConfigContext = React.createContext<AppConfigContextValue | undefined>(undefined);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<AppConfig>(appConfigDefaults);

  const refreshConfig = React.useCallback(async () => {
    const nextConfig = await getAppConfig();
    setConfig(nextConfig);
  }, []);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const nextConfig = await getAppConfig();
      if (active) {
        setConfig(nextConfig);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = React.useMemo(
    () => ({ config, setConfig, refreshConfig }),
    [config, refreshConfig]
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfigContext() {
  const context = React.useContext(AppConfigContext);
  if (!context) {
    throw new Error("useAppConfigContext must be used within AppConfigProvider");
  }
  return context;
}
