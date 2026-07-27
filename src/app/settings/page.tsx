"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { GradientHeader } from "@/components/layout/headers";
import { BottomNavigation } from "@/components/layout/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { Select } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { useFamilies, useMembers, useSetting } from "@/hooks/use-database";
import { useAppConfig } from "@/hooks/use-app-config";
import { resetEntireApp } from "@/database/crud";
import { BackupManager } from "@/components/backup/backup-manager";
import { listBackups, formatBytes } from "@/database/backup";
import { BackupRecord } from "@/types/schema";
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash2,
  HardDrive,
  Globe,
  Info,
  RefreshCw,
} from "lucide-react";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (US)" },
  { value: "es", label: "Español (Spanish)" },
  { value: "fr", label: "Français (French)" },
  { value: "de", label: "Deutsch (German)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { config } = useAppConfig();
  const families = useFamilies();
  const members = useMembers();

  // Language setting
  const [language, setLanguage] = useSetting<string>("language", "en");

  // Stats & Backups count
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [storageEstimate, setStorageEstimate] = React.useState<{ usage: number; quota: number } | null>(null);

  // Dialogs
  const [showResetAppModal, setShowResetAppModal] = React.useState(false);
  const [activeInfoTab, setActiveInfoTab] = React.useState<"about" | "privacy" | "terms">("about");
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const records = await listBackups();
        if (!active) return;
        setBackups(records);

        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (!active) return;
          setStorageEstimate({
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load storage estimate:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleExecuteResetApp = async () => {
    try {
      setIsBusy(true);
      await resetEntireApp();
      toast.success("Application data reset to clean initial state.");
      setShowResetAppModal(false);
    } catch (error) {
      toast.error(`Reset failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background text-foreground transition-colors duration-200">
      <GradientHeader
        title="Settings & System Management"
        description="Configure preferences, backup & restore data, inspect storage usage, and view application terms."
        showBackButton={true}
      />

      <main className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        {/* THEME PREFERENCES SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Palette className="h-5 w-5" />
            <h2 className="text-lg font-bold">Theme Preferences</h2>
          </div>

          <Card className="shadow-md">
            <p className="text-sm text-muted-foreground mb-6">
              Choose your preferred appearance. System mode automatically aligns with your device settings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                variant={theme === "light" ? "primary" : "secondary"}
                className={`w-full justify-start gap-3 h-14 ${
                  theme === "light" ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={() => setTheme("light")}
              >
                <Sun className="h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Light Mode</p>
                  <p className="text-[10px] opacity-80">Clean light palette</p>
                </div>
              </Button>

              <Button
                variant={theme === "dark" ? "primary" : "secondary"}
                className={`w-full justify-start gap-3 h-14 ${
                  theme === "dark" ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-5 w-5 text-indigo-400" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Dark Mode</p>
                  <p className="text-[10px] opacity-80">Sleek dark palette</p>
                </div>
              </Button>

              <Button
                variant={theme === "system" ? "primary" : "secondary"}
                className={`w-full justify-start gap-3 h-14 ${
                  theme === "system" ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={() => setTheme("system")}
              >
                <Laptop className="h-5 w-5 text-emerald-400" />
                <div className="text-left">
                  <p className="font-semibold text-sm">System Mode</p>
                  <p className="text-[10px] opacity-80">Follows device preference</p>
                </div>
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Current theme: <span className="capitalize text-foreground font-semibold">{theme}</span>
              </span>
              <Badge variant="success" className="gap-1">
                <Sparkles className="h-3 w-3" />
                IndexedDB Saved
              </Badge>
            </div>
          </Card>
        </section>

        {/* LANGUAGE SELECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Globe className="h-5 w-5" />
            <h2 className="text-lg font-bold">Language Preferences</h2>
          </div>

          <Card className="shadow-md space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your interface language. Language preferences are stored locally in your browser settings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <Select
                label="Application Language"
                options={LANGUAGE_OPTIONS}
                value={language || "en"}
                onChange={(e) => {
                  void setLanguage(e.target.value);
                  toast.success("Language preference updated!");
                }}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-2xl border border-border/30">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Architecture ready for full i18n string translations.</span>
              </div>
            </div>
          </Card>
        </section>

        {/* STORAGE USAGE & METRICS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <HardDrive className="h-5 w-5" />
            <h2 className="text-lg font-bold">Storage Usage & Data Metrics</h2>
          </div>

          <Card className="shadow-md space-y-6">
            <p className="text-sm text-muted-foreground">
              Overview of local storage usage and object counts stored offline inside your browser&apos;s IndexedDB engine.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Families</span>
                <span className="text-2xl font-extrabold text-primary">{families?.length ?? 0}</span>
                <span className="text-[10px] text-muted-foreground block">Family records</span>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Members</span>
                <span className="text-2xl font-extrabold text-secondary">{members?.length ?? 0}</span>
                <span className="text-[10px] text-muted-foreground block">Person profiles</span>
              </div>

              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Local Backups</span>
                <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">{backups.length}</span>
                <span className="text-[10px] text-muted-foreground block">Saved snapshots</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">Estimated Storage</span>
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {storageEstimate ? formatBytes(storageEstimate.usage) : "Active"}
                </span>
                <span className="text-[10px] text-muted-foreground block">Browser IndexedDB</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ADMIN PANEL LINK */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-lg font-bold">Admin Controls</h2>
          </div>

          <Card className="shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground">Local Admin Panel (/admin)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage app name, branding colors, announcement banner, maintenance mode, and offline configs.
                </p>
              </div>
              <Button variant="primary" onClick={() => router.push("/admin")} className="gap-2 shrink-0">
                <ShieldCheck className="h-4 w-4" />
                Open Admin Panel
              </Button>
            </div>
          </Card>
        </section>

        {/* BACKUP & RESTORE SYSTEM */}
        <BackupManager />

        {/* RESET APP DATA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <RefreshCw className="h-5 w-5" />
            <h2 className="text-lg font-bold">Reset Application</h2>
          </div>

          <Card className="shadow-md border-destructive/30 bg-destructive/5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground">Wipe All Local Application Data</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Resets all families, member trees, settings, and local backup records to a clean initial state.
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => setShowResetAppModal(true)}
                disabled={isBusy}
                className="gap-2 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                Reset App Data
              </Button>
            </div>
          </Card>
        </section>

        {/* ABOUT & TERMS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-5 w-5" />
              <h2 className="text-lg font-bold">Information & Terms</h2>
            </div>
            <Badge variant="secondary">App Version {config.appVersion}</Badge>
          </div>

          <Card className="shadow-md space-y-4">
            <div className="flex border-b border-border/40 gap-2">
              <button
                type="button"
                onClick={() => setActiveInfoTab("about")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  activeInfoTab === "about"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                About Application
              </button>
              <button
                type="button"
                onClick={() => setActiveInfoTab("privacy")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  activeInfoTab === "privacy"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveInfoTab("terms")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  activeInfoTab === "terms"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Terms & Conditions
              </button>
            </div>

            <div className="pt-2">
              {activeInfoTab === "about" && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-foreground">{config.appName}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {config.aboutContent || "Privacy-first offline family tree management software."}
                  </p>
                  {config.contactInformation && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/30 text-xs">
                      <span className="font-semibold text-foreground block">Contact & Support:</span>
                      <span className="text-muted-foreground">{config.contactInformation}</span>
                    </div>
                  )}
                </div>
              )}

              {activeInfoTab === "privacy" && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-foreground">Privacy Policy</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {config.privacyContent || "All family tree records stay completely offline inside your browser's IndexedDB."}
                  </p>
                </div>
              )}

              {activeInfoTab === "terms" && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-foreground">Terms & Conditions</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {config.termsContent || "Use this application responsibly for your offline family management."}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Privacy Banner */}
        <Card className="bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 shadow-xs flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Privacy first. Zero cloud trackers.</h4>
            <p className="text-xs opacity-90 mt-1">
              Your configurations and tree data stay in your browser inside IndexedDB.
            </p>
          </div>
        </Card>
      </main>

      <BottomNavigation />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetAppModal}
        onClose={() => setShowResetAppModal(false)}
        onConfirm={() => void handleExecuteResetApp()}
        title="Wipe Entire Application Data?"
        description="Are you sure you want to reset and wipe ALL families, members, settings, and local backups from this device? This action cannot be undone."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
