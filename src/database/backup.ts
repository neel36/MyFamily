import { db } from "./index";
import {
  BackupRecord,
  Family,
  Member,
  Setting,
  familySchema,
  memberSchema,
  settingSchema,
  backupSchema,
} from "../types/schema";
import { z } from "zod";

export type BackupType = "full" | "family" | "settings";

export interface BackupPayload {
  version: number;
  exportedAt: number;
  type: BackupType;
  familyId?: string;
  app: {
    families: Family[];
    members: Member[];
    settings: Setting[];
  };
  metadata: {
    familyCount: number;
    memberCount: number;
    settingCount: number;
  };
}

export interface BackupImportPreview {
  payload: BackupPayload | null;
  error?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFileName(type: BackupType, familyName?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (type === "family" && familyName) {
    const safeName = familyName.trim().replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    return `${safeName}-${stamp}.json`;
  }
  if (type === "settings") {
    return `settings-${stamp}.json`;
  }
  return `my-family-backup-${stamp}.json`;
}

async function readCurrentSnapshot(type: BackupType, familyId?: string): Promise<BackupPayload> {
  const [families, members, settings] = await Promise.all([
    db.families.toArray(),
    db.members.toArray(),
    db.settings.toArray(),
  ]);

  let selectedFamilies = families;
  let selectedMembers = members;

  if (type === "family") {
    if (!familyId) {
      throw new Error("A family must be selected before exporting a single family backup.");
    }

    const family = families.find((item) => item.id === familyId);
    if (!family) {
      throw new Error("Selected family could not be found.");
    }

    selectedFamilies = [family];
    selectedMembers = members.filter((member) => member.familyId === familyId);
  }

  if (type === "settings") {
    selectedFamilies = [];
    selectedMembers = [];
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    type,
    familyId,
    app: {
      families: selectedFamilies,
      members: selectedMembers,
      settings,
    },
    metadata: {
      familyCount: selectedFamilies.length,
      memberCount: selectedMembers.length,
      settingCount: settings.length,
    },
  };
}

function serializePayload(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
}

function parsePayload(content: string): BackupPayload {
  if (!content || !content.trim()) {
    throw new Error("The backup file is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON syntax: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid backup file structure. Expected a valid JSON object.");
  }

  const candidate = parsed as Record<string, unknown>;

  if (typeof candidate.version !== "number") {
    throw new Error("Missing or invalid 'version' property in backup file.");
  }

  if (candidate.version !== 1) {
    throw new Error(`Unsupported backup version (${candidate.version}). Only version 1 is supported.`);
  }

  if (typeof candidate.exportedAt !== "number" || isNaN(candidate.exportedAt)) {
    throw new Error("Missing or invalid 'exportedAt' timestamp in backup file.");
  }

  if (candidate.type !== "full" && candidate.type !== "family" && candidate.type !== "settings") {
    throw new Error("Invalid backup type. Must be 'full', 'family', or 'settings'.");
  }

  if (!candidate.app || typeof candidate.app !== "object" || Array.isArray(candidate.app)) {
    throw new Error("Corrupted backup file: missing or invalid 'app' data section.");
  }

  const app = candidate.app as Record<string, unknown>;
  const families = Array.isArray(app.families) ? app.families : [];
  const members = Array.isArray(app.members) ? app.members : [];
  const settings = Array.isArray(app.settings) ? app.settings : [];

  const validatedFamilies: Family[] = [];
  for (let i = 0; i < families.length; i++) {
    const item = families[i];
    try {
      validatedFamilies.push(familySchema.parse(item));
    } catch (error) {
      const name = (item && typeof item === "object" && "name" in item && typeof item.name === "string") ? item.name : `Index ${i + 1}`;
      const details = error instanceof z.ZodError ? formatZodIssues(error) : (error as Error).message;
      throw new Error(`Corrupted Family entry #${i + 1} ("${name}"): ${details}`);
    }
  }

  const validatedMembers: Member[] = [];
  for (let i = 0; i < members.length; i++) {
    const item = members[i];
    try {
      validatedMembers.push(memberSchema.parse(item));
    } catch (error) {
      const name = (item && typeof item === "object" && "name" in item && typeof item.name === "string") ? item.name : `Index ${i + 1}`;
      const details = error instanceof z.ZodError ? formatZodIssues(error) : (error as Error).message;
      throw new Error(`Corrupted Member entry #${i + 1} ("${name}"): ${details}`);
    }
  }

  const validatedSettings: Setting[] = [];
  for (let i = 0; i < settings.length; i++) {
    const item = settings[i];
    try {
      validatedSettings.push(settingSchema.parse(item));
    } catch (error) {
      const key = (item && typeof item === "object" && "key" in item && typeof item.key === "string") ? item.key : `Index ${i + 1}`;
      const details = error instanceof z.ZodError ? formatZodIssues(error) : (error as Error).message;
      throw new Error(`Corrupted Setting entry #${i + 1} ("${key}"): ${details}`);
    }
  }

  const metadata = candidate.metadata as Record<string, unknown> | undefined;
  const normalizedMetadata = {
    familyCount: typeof metadata?.familyCount === "number" ? metadata.familyCount : validatedFamilies.length,
    memberCount: typeof metadata?.memberCount === "number" ? metadata.memberCount : validatedMembers.length,
    settingCount: typeof metadata?.settingCount === "number" ? metadata.settingCount : validatedSettings.length,
  };

  return {
    version: 1,
    exportedAt: candidate.exportedAt,
    type: candidate.type as BackupType,
    familyId: typeof candidate.familyId === "string" ? candidate.familyId : undefined,
    app: {
      families: validatedFamilies,
      members: validatedMembers,
      settings: validatedSettings,
    },
    metadata: normalizedMetadata,
  };
}

export async function createBackupRecord(options: {
  name: string;
  description?: string;
  backupType: BackupType;
  payload: BackupPayload;
  fileName?: string;
}): Promise<BackupRecord> {
  const serialized = serializePayload(options.payload);
  const record: BackupRecord = {
    id: `backup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    name: options.name.trim(),
    description: options.description?.trim(),
    backupType: options.backupType,
    size: new TextEncoder().encode(serialized).length,
    familyCount: options.payload.metadata.familyCount,
    memberCount: options.payload.metadata.memberCount,
    settingCount: options.payload.metadata.settingCount,
    payload: serialized,
    fileName: options.fileName ?? buildFileName(options.backupType),
  };

  backupSchema.parse(record);
  await db.backups.add(record);
  return record;
}

export async function exportBackup(options: {
  backupType: BackupType;
  familyId?: string;
  name?: string;
  description?: string;
}): Promise<{ payload: BackupPayload; json: string; fileName: string; record: BackupRecord }> {
  const payload = await readCurrentSnapshot(options.backupType, options.familyId);
  const json = serializePayload(payload);
  
  let targetFamilyName: string | undefined;
  if (options.familyId) {
    const family = await db.families.get(options.familyId);
    targetFamilyName = family?.name;
  }

  const fileName = buildFileName(options.backupType, targetFamilyName);
  
  let defaultName = "Application Backup";
  if (options.backupType === "family") {
    defaultName = targetFamilyName ? `Backup of ${targetFamilyName}` : "Family Backup";
  } else if (options.backupType === "settings") {
    defaultName = "Settings Backup";
  }

  const record = await createBackupRecord({
    name: options.name ?? defaultName,
    description: options.description ?? (options.backupType === "family" && targetFamilyName ? `Single family export for ${targetFamilyName}.` : undefined),
    backupType: options.backupType,
    payload,
    fileName,
  });

  return { payload, json, fileName, record };
}

export async function downloadBackupFile(json: string, fileName: string): Promise<void> {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function createAutomaticBackupBeforeImport(): Promise<BackupRecord> {
  const payload = await readCurrentSnapshot("full");
  return createBackupRecord({
    name: `Auto-Backup (${new Date().toLocaleString()})`,
    description: "Automatic backup created before importing data.",
    backupType: "full",
    payload,
    fileName: `auto-backup-${new Date().toISOString().slice(0, 10)}.json`,
  });
}

export async function parseBackupFile(content: string): Promise<BackupImportPreview> {
  try {
    const payload = parsePayload(content);
    return { payload };
  } catch (error) {
    return { payload: null, error: (error as Error).message };
  }
}

export async function importBackup(options: {
  payload: BackupPayload;
  mode: "merge" | "replace";
}): Promise<{ importedFamilies: number; importedMembers: number; importedSettings: number }> {
  const { payload, mode } = options;

  await db.transaction("rw", [db.families, db.members, db.settings], async () => {
    if (mode === "replace") {
      if (payload.type === "full") {
        await db.families.clear();
        await db.members.clear();
        await db.settings.clear();
      } else if (payload.type === "family") {
        const familyIds = payload.app.families.map((family) => family.id);
        for (const familyId of familyIds) {
          await db.members.where("familyId").equals(familyId).delete();
          await db.families.delete(familyId);
        }
      } else if (payload.type === "settings") {
        await db.settings.clear();
      }
    }

    await Promise.all([
      ...payload.app.families.map((family) => db.families.put(family)),
      ...payload.app.members.map((member) => db.members.put(member)),
      ...payload.app.settings.map((setting) => db.settings.put(setting)),
    ]);
  });

  return {
    importedFamilies: payload.app.families.length,
    importedMembers: payload.app.members.length,
    importedSettings: payload.app.settings.length,
  };
}

export async function listBackups(): Promise<BackupRecord[]> {
  return db.backups.orderBy("createdAt").reverse().toArray();
}

export async function deleteBackupRecord(id: string): Promise<void> {
  await db.backups.delete(id);
}

export async function restoreBackupRecord(
  id: string,
  mode: "merge" | "replace"
): Promise<{ importedFamilies: number; importedMembers: number; importedSettings: number }> {
  const record = await db.backups.get(id);
  if (!record) {
    throw new Error("Local backup record not found.");
  }

  const { payload, error } = await parseBackupFile(record.payload);
  if (!payload || error) {
    throw new Error(`Failed to restore local backup: ${error || "Corrupted payload"}`);
  }

  // Create automatic snapshot of current database state before restoring
  await createAutomaticBackupBeforeImport();

  return importBackup({ payload, mode });
}

export function getBackupSummary(record: BackupRecord) {
  return {
    sizeLabel: formatBytes(record.size),
    createdAtLabel: new Date(record.createdAt).toLocaleString(),
  };
}
