import { db } from "./index";
import { AppConfig, appConfigSchema, appConfigDefaults } from "@/types/schema";

const CONFIG_KEY = "app-config";

export async function getDefaultConfig(): Promise<AppConfig> {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) {
      return appConfigDefaults;
    }
    const parsed = await response.json();
    return appConfigSchema.parse({ ...appConfigDefaults, ...parsed });
  } catch {
    return appConfigDefaults;
  }
}

export async function getAppConfig(): Promise<AppConfig> {
  const stored = await db.settings.get(CONFIG_KEY);
  const defaults = await getDefaultConfig();

  if (!stored?.value) {
    return defaults;
  }

  try {
    const parsed = typeof stored.value === "string" ? JSON.parse(stored.value) : stored.value;
    return appConfigSchema.parse({ ...defaults, ...parsed });
  } catch {
    return defaults;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<AppConfig> {
  const validated = appConfigSchema.parse(config);
  await db.settings.put({ key: CONFIG_KEY, value: validated });
  return validated;
}

export async function resetAppConfig(): Promise<AppConfig> {
  const defaults = await getDefaultConfig();
  return saveAppConfig(defaults);
}

export async function exportAppConfig(): Promise<string> {
  const config = await getAppConfig();
  return JSON.stringify(config, null, 2);
}

export async function importAppConfig(content: string): Promise<AppConfig> {
  try {
    const parsed = JSON.parse(content);
    const config = appConfigSchema.parse(parsed);
    return saveAppConfig(config);
  } catch (error) {
    throw new Error((error as Error).message);
  }
}
