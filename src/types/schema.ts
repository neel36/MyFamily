import { z } from "zod";

export const familySchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Family name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  color: z.string().optional(), // Color theme key: "blue" | "emerald" | "orange" | "violet" | "rose" | "amber" | "teal"
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type Family = z.infer<typeof familySchema>;

export const memberSchema = z.object({
  id: z.string().min(1, "ID is required"),
  familyId: z.string().min(1, "Family ID is required"),
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  alive: z.boolean(),
  fatherId: z.string().optional(),
  motherId: z.string().optional(),
  spouseId: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  bloodGroup: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(), // Base64 encoded image string
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type Member = z.infer<typeof memberSchema>;

export const settingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export type Setting = z.infer<typeof settingSchema>;

export const backupSchema = z.object({
  id: z.string().min(1, "ID is required"),
  createdAt: z.number().int().positive(),
  name: z.string().min(1, "Backup name is required"),
  description: z.string().optional(),
  backupType: z.enum(["full", "family", "settings"]),
  size: z.number().int().nonnegative(),
  familyCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  settingCount: z.number().int().nonnegative(),
  payload: z.string().min(1, "Backup payload is required"),
  fileName: z.string().min(1, "Backup filename is required"),
});

export type BackupRecord = z.infer<typeof backupSchema>;

export const appConfigSchema = z.object({
  appName: z.string().min(1, "App name is required"),
  appLogo: z.string().default("/icons/icon-192x192.png"),
  primaryColor: z.string().min(1, "Primary color is required"),
  secondaryColor: z.string().min(1, "Secondary color is required"),
  announcementBar: z.string().default(""),
  maintenanceMode: z.boolean().default(false),
  defaultTheme: z.enum(["light", "dark", "system"]).default("system"),
  appVersion: z.string().min(1, "App version is required"),
  contactInformation: z.string().default(""),
  aboutContent: z.string().default(""),
  privacyContent: z.string().default(""),
  termsContent: z.string().default(""),
  adsEnabled: z.boolean().default(false),
  adsProvider: z.enum(["none", "google-adsense", "custom-html"]).default("none"),
  adsType: z.enum(["banner", "native", "interstitial", "placeholder"]).default("banner"),
  adPosition: z.enum(["top", "middle", "bottom", "sidebar"]).default("bottom"),
  adFrequency: z.number().int().min(1).max(10).default(3),
  responsiveAds: z.boolean().default(true),
  customAdCode: z.string().default(""),
  testMode: z.boolean().default(true),
  adsContent: z.string().default(""),
  pwaEnabled: z.boolean().default(true),
  installPromptEnabled: z.boolean().default(true),
  offlineModeEnabled: z.boolean().default(true),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfigDefaults: AppConfig = {
  appName: "My Family",
  appLogo: "/icons/icon-192x192.png",
  primaryColor: "#2563eb",
  secondaryColor: "#10b981",
  announcementBar: "",
  maintenanceMode: false,
  defaultTheme: "system",
  appVersion: "1.0.0",
  contactInformation: "",
  aboutContent: "Privacy-first family management built for offline use.",
  privacyContent: "Your family data stays in your browser.",
  termsContent: "Use this application responsibly and keep your data private.",
  adsEnabled: false,
  adsProvider: "none",
  adsType: "banner",
  adPosition: "bottom",
  adFrequency: 3,
  responsiveAds: true,
  customAdCode: "",
  testMode: true,
  adsContent: "",
  pwaEnabled: true,
  installPromptEnabled: true,
  offlineModeEnabled: true,
};
