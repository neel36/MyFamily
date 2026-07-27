"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { Select } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useFamilies, useMembers } from "@/hooks/use-database";
import {
  listBackups,
  exportBackup,
  downloadBackupFile,
  parseBackupFile,
  importBackup,
  createAutomaticBackupBeforeImport,
  deleteBackupRecord,
  restoreBackupRecord,
  getBackupSummary,
  formatBytes,
  type BackupPayload,
  type BackupType,
} from "@/database/backup";
import { BackupRecord } from "@/types/schema";
import {
  Download,
  Upload,
  DatabaseZap,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  HardDrive,
  Users,
  FolderHeart,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Clock,
  FileCode,
} from "lucide-react";

export function BackupManager() {
  const families = useFamilies();
  const members = useMembers();

  // Local backups list state
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [isBusy, setIsBusy] = React.useState(false);

  // Storage estimation state
  const [storageEstimate, setStorageEstimate] = React.useState<{ usage: number; quota: number } | null>(null);

  // Single family export selection
  const [userSelectedExportFamilyId, setUserSelectedExportFamilyId] = React.useState<string>("");
  const selectedExportFamilyId = userSelectedExportFamilyId || (families && families.length > 0 ? families[0].id : "");

  // Import file & preview state
  const [importMode, setImportMode] = React.useState<"merge" | "replace">("merge");
  const [selectedFileName, setSelectedFileName] = React.useState<string>("");
  const [selectedFileSize, setSelectedFileSize] = React.useState<number>(0);
  const [preview, setPreview] = React.useState<{ payload: BackupPayload | null; error?: string } | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Confirmation dialog states
  const [showImportConfirmModal, setShowImportConfirmModal] = React.useState(false);
  const [restoringBackupId, setRestoringBackupId] = React.useState<string | null>(null);
  const [deletingBackupId, setDeletingBackupId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Refresh backups list & storage estimate
  const refreshStatsAndBackups = React.useCallback(async () => {
    try {
      const records = await listBackups();
      setBackups(records);

      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load backups or storage estimate:", err);
    }
  }, []);

  React.useEffect(() => {
    let isSubscribed = true;
    void (async () => {
      try {
        const records = await listBackups();
        if (!isSubscribed) return;
        setBackups(records);

        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (!isSubscribed) return;
          setStorageEstimate({
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load backups or storage estimate:", err);
      }
    })();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // ---------------------------------------------------------
  // EXPORT HANDLERS
  // ---------------------------------------------------------
  const handleExport = async (type: BackupType) => {
    try {
      setIsBusy(true);

      if (type === "family" && !selectedExportFamilyId) {
        toast.error("Please select a family to export.");
        return;
      }

      const { json, fileName } = await exportBackup({
        backupType: type,
        familyId: type === "family" ? selectedExportFamilyId : undefined,
      });

      await downloadBackupFile(json, fileName);
      await refreshStatsAndBackups();

      const label =
        type === "full"
          ? "Entire application"
          : type === "family"
          ? `Family "${families.find((f) => f.id === selectedExportFamilyId)?.name || ""}"`
          : "Application settings";

      toast.success(`${label} exported successfully to ${fileName}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  // ---------------------------------------------------------
  // IMPORT FILE PROCESSOR & VALIDATOR
  // ---------------------------------------------------------
  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setPreview({ payload: null, error: "Invalid file type. Only JSON backup files (.json) are accepted." });
      setSelectedFileName(file.name);
      setSelectedFileSize(file.size);
      toast.error("Selected file is not a valid JSON backup file.");
      return;
    }

    try {
      setIsBusy(true);
      const text = await file.text();
      const previewResult = await parseBackupFile(text);

      setSelectedFileName(file.name);
      setSelectedFileSize(file.size);
      setPreview(previewResult);

      if (previewResult.error) {
        toast.error("Backup file validation failed.");
      } else {
        toast.success("Backup file structure validated successfully.");
      }
    } catch (error) {
      setSelectedFileName(file.name);
      setSelectedFileSize(file.size);
      setPreview({ payload: null, error: (error as Error).message });
      toast.error(`File parsing error: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const resetImportSelection = () => {
    setPreview(null);
    setSelectedFileName("");
    setSelectedFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------
  // IMPORT EXECUTION (WITH AUTOMATIC PRE-IMPORT BACKUP)
  // ---------------------------------------------------------
  const executeImport = async () => {
    if (!preview?.payload) {
      toast.error("No valid backup payload selected.");
      return;
    }

    try {
      setIsBusy(true);

      // Automatic safety backup before every import
      await createAutomaticBackupBeforeImport();

      const summary = await importBackup({
        payload: preview.payload,
        mode: importMode,
      });

      await refreshStatsAndBackups();

      toast.success(
        `Import completed! (${summary.importedFamilies} families, ${summary.importedMembers} members, ${summary.importedSettings} settings).`
      );

      resetImportSelection();
      setShowImportConfirmModal(false);
    } catch (error) {
      toast.error(`Import failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // ---------------------------------------------------------
  // RESTORE & DELETE LOCAL BACKUP RECORDS
  // ---------------------------------------------------------
  const handleExecuteRestore = async () => {
    if (!restoringBackupId) return;

    try {
      setIsBusy(true);
      const summary = await restoreBackupRecord(restoringBackupId, importMode);
      await refreshStatsAndBackups();

      toast.success(
        `Restored backup successfully! (${summary.importedFamilies} families, ${summary.importedMembers} members, ${summary.importedSettings} settings).`
      );
      setRestoringBackupId(null);
    } catch (error) {
      toast.error(`Restore failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deletingBackupId) return;

    try {
      setIsBusy(true);
      await deleteBackupRecord(deletingBackupId);
      await refreshStatsAndBackups();
      toast.success("Local backup record deleted.");
      setDeletingBackupId(null);
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const familyOptions = (families || []).map((f) => ({
    value: f.id,
    label: f.name,
  }));

  return (
    <div className="space-y-8">
      {/* ================================================= */}
      {/* OFFLINE & AUTO-BACKUP NOTICE BANNER               */}
      {/* ================================================= */}
      <Card className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border-primary/20 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                100% Offline Local Backup System
                <Badge variant="success" className="text-[10px]">
                  No Cloud
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                All backup snapshots are safely stored in local IndexedDB. Automatic backups are taken before every import.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshStatsAndBackups()}
            className="gap-1.5 shrink-0 self-end sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Stats
          </Button>
        </div>
      </Card>

      {/* ================================================= */}
      {/* SYSTEM STORAGE & DATA METRICS                     */}
      {/* ================================================= */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <HardDrive className="h-5 w-5" />
          <span>Local Storage Metrics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">Active Families</span>
            <span className="text-2xl font-extrabold text-primary">{families?.length ?? 0}</span>
            <span className="text-[10px] text-muted-foreground block">Family records</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">Active Members</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {members?.length ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block">Person profiles</span>
          </div>

          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">Local Backups</span>
            <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">{backups.length}</span>
            <span className="text-[10px] text-muted-foreground block">Saved snapshots</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">Storage Usage</span>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {storageEstimate ? formatBytes(storageEstimate.usage) : "IndexedDB"}
            </span>
            <span className="text-[10px] text-muted-foreground block">Browser storage</span>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* EXPORT DATA SECTION                               */}
      {/* ================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-lg">
          <Download className="h-5 w-5" />
          <span>Export Data</span>
        </div>

        <Card className="shadow-md space-y-6">
          <p className="text-sm text-muted-foreground">
            Export your data to structured JSON files. All export options automatically register a local backup snapshot record in your browser storage.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 1. Export Entire Application */}
            <div className="flex flex-col justify-between p-5 rounded-2xl border border-border/50 bg-card/50 space-y-4 hover:border-primary/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-base">
                  <DatabaseZap className="h-5 w-5" />
                  Entire Application
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exports all family trees, member details, relationships, and application settings into a single JSON file.
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full justify-center gap-2"
                onClick={() => void handleExport("full")}
                disabled={isBusy}
              >
                <Download className="h-4 w-4" />
                Export Entire App
              </Button>
            </div>

            {/* 2. Export Single Family */}
            <div className="flex flex-col justify-between p-5 rounded-2xl border border-border/50 bg-card/50 space-y-4 hover:border-primary/40 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  <FolderHeart className="h-5 w-5" />
                  Single Family
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export a specific family tree along with only its associated member records.
                </p>
                {families && families.length > 0 ? (
                  <Select
                    label="Select Family"
                    options={familyOptions}
                    value={selectedExportFamilyId}
                    onChange={(e) => setUserSelectedExportFamilyId(e.target.value)}
                  />
                ) : (
                  <p className="text-xs text-amber-500 font-medium">No families created yet.</p>
                )}
              </div>
              <Button
                variant="secondary"
                className="w-full justify-center gap-2"
                onClick={() => void handleExport("family")}
                disabled={isBusy || !families || families.length === 0}
              >
                <Download className="h-4 w-4" />
                Export Family JSON
              </Button>
            </div>

            {/* 3. Export Settings Only */}
            <div className="flex flex-col justify-between p-5 rounded-2xl border border-border/50 bg-card/50 space-y-4 hover:border-primary/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-base">
                  <SettingsIcon className="h-5 w-5" />
                  Settings Only
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exports application settings, theme configurations, and custom preferences without family/member data.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => void handleExport("settings")}
                disabled={isBusy}
              >
                <Download className="h-4 w-4" />
                Export Settings JSON
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* ================================================= */}
      {/* IMPORT & VALIDATION SECTION                       */}
      {/* ================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
          <Upload className="h-5 w-5" />
          <span>Import & Validate Data</span>
        </div>

        <Card className="shadow-md space-y-6">
          <p className="text-sm text-muted-foreground">
            Import a JSON backup file. The backup file structure and data schemas will be thoroughly validated before execution.
          </p>

          {/* File Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <FileJson className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {selectedFileName ? selectedFileName : "Click or drag & drop JSON backup file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts full app backups, single family exports, or settings JSON.
                </p>
              </div>
              {selectedFileName && selectedFileSize > 0 && (
                <Badge variant="primary" className="mt-1 font-mono">
                  {formatBytes(selectedFileSize)}
                </Badge>
              )}
            </div>
          </div>

          {/* Strategy Mode Selector */}
          <div className="space-y-3 p-4 rounded-2xl border border-border/40 bg-card/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Import Strategy Mode
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportMode("merge")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  importMode === "merge"
                    ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                    : "border-border/40 bg-card hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Merge Existing Data
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Upserts items into your database without clearing your existing families or members.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  importMode === "replace"
                    ? "border-destructive bg-destructive/10 text-foreground ring-2 ring-destructive/30"
                    : "border-border/40 bg-card hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className="text-sm font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Replace Existing Data
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Clears current data in the backup scope before writing the imported records.
                </span>
              </button>
            </div>
          </div>

          {/* Validation & Preview Card */}
          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {preview.error ? (
                /* Validation Error Banner */
                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                    Rejected Invalid or Corrupted Data
                  </div>
                  <div className="text-xs font-mono break-words bg-card/70 p-3 rounded-xl border border-destructive/20 text-foreground space-y-1">
                    <p className="font-semibold text-destructive">{preview.error}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please fix the JSON file formatting or choose a valid JSON export file.
                  </p>
                </div>
              ) : preview.payload ? (
                /* Valid Preview Card */
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Validation Successful — Ready to Import
                    </div>
                    <Badge variant="success" className="capitalize">
                      {preview.payload.type} Backup
                    </Badge>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Export Date
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {new Date(preview.payload.exportedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block flex items-center gap-1">
                        <FolderHeart className="h-3.5 w-3.5 text-emerald-500" />
                        Families
                      </span>
                      <span className="font-bold text-foreground text-base mt-0.5 block">
                        {preview.payload.metadata.familyCount}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-secondary" />
                        Members
                      </span>
                      <span className="font-bold text-foreground text-base mt-0.5 block">
                        {preview.payload.metadata.memberCount}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-card border border-border/40">
                      <span className="text-muted-foreground block flex items-center gap-1">
                        <SettingsIcon className="h-3.5 w-3.5 text-violet-500" />
                        Settings
                      </span>
                      <span className="font-bold text-foreground text-base mt-0.5 block">
                        {preview.payload.metadata.settingCount}
                      </span>
                    </div>
                  </div>

                  {/* Included Families Tag List */}
                  {preview.payload.app.families.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Included Families in Preview:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.payload.app.families.map((fam) => (
                          <Badge key={fam.id} variant="secondary" className="gap-1">
                            <Users className="h-3 w-3 text-primary" />
                            {fam.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button variant="ghost" size="sm" onClick={resetImportSelection}>
                      Clear Selection
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setShowImportConfirmModal(true)}
                      disabled={isBusy}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Confirm & Import Data
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </Card>
      </section>

      {/* ================================================= */}
      {/* LOCAL BACKUP HISTORY SECTION                      */}
      {/* ================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <HardDrive className="h-5 w-5" />
            <span>Local Backup History</span>
          </div>
          <Badge variant="primary" className="gap-1">
            <DatabaseZap className="h-3 w-3" />
            {backups.length} Saved Snapshots
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {backups.length === 0 ? (
            <Card className="shadow-sm border-dashed text-center py-10 md:col-span-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <FileCode className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-foreground">No local backups stored yet.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Exporting data or performing an import automatically creates a local snapshot entry here in IndexedDB.
              </p>
            </Card>
          ) : (
            backups.map((backup) => {
              const summary = getBackupSummary(backup);
              const isAuto = backup.name.toLowerCase().includes("auto");

              return (
                <Card
                  key={backup.id}
                  className="shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{backup.name}</h4>
                          {isAuto && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{summary.createdAtLabel}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize shrink-0 text-[10px]">
                        {backup.backupType}
                      </Badge>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[10px] text-muted-foreground block">Size</span>
                        <span className="font-semibold">{summary.sizeLabel}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[10px] text-muted-foreground block">Families</span>
                        <span className="font-semibold">{backup.familyCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[10px] text-muted-foreground block">Members</span>
                        <span className="font-semibold">{backup.memberCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[10px] text-muted-foreground block">Settings</span>
                        <span className="font-semibold">{backup.settingCount}</span>
                      </div>
                    </div>

                    {backup.description && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &ldquo;{backup.description}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-primary hover:text-primary"
                      onClick={() => void downloadBackupFile(backup.payload, backup.fileName)}
                      title="Download JSON file"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setRestoringBackupId(backup.id)}
                      title="Restore this backup"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingBackupId(backup.id)}
                      title="Delete backup record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showImportConfirmModal}
        onClose={() => setShowImportConfirmModal(false)}
        onConfirm={() => void executeImport()}
        title="Confirm Data Import"
        description={`Are you sure you want to import this ${preview?.payload?.type || ""} backup using ${
          importMode === "merge" ? "Merge" : "Replace"
        } strategy? An automatic safety backup of your current database will be created first.`}
        confirmText="Confirm & Import"
        cancelText="Cancel"
        variant={importMode === "replace" ? "danger" : "primary"}
      />

      <ConfirmationDialog
        isOpen={Boolean(restoringBackupId)}
        onClose={() => setRestoringBackupId(null)}
        onConfirm={() => void handleExecuteRestore()}
        title="Restore Local Backup?"
        description={`Are you sure you want to restore this local backup into your database using ${
          importMode === "merge" ? "Merge" : "Replace"
        } strategy? An automatic safety backup will be created first.`}
        confirmText="Restore Backup"
        cancelText="Cancel"
        variant="primary"
      />

      <ConfirmationDialog
        isOpen={Boolean(deletingBackupId)}
        onClose={() => setDeletingBackupId(null)}
        onConfirm={() => void handleExecuteDelete()}
        title="Delete Local Backup Record?"
        description="Are you sure you want to delete this backup entry from your browser storage? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
