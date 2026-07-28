"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { GradientHeader } from "@/components/layout/headers";
import { BottomNavigation } from "@/components/layout/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { db } from "@/database";
import { useAppConfig } from "@/hooks/use-app-config";
import {
  exportAppConfig,
  getAppConfig,
  importAppConfig,
  resetAppConfig,
  saveAppConfig,
} from "@/database/config";
import { AppConfig, appConfigDefaults } from "@/types/schema";
import {
  ShieldCheck,
  Lock,
  Upload,
  Download,
  RotateCcw,
  Settings2,
  Sparkles,
  Key,
  Info,
  Sliders,
  Megaphone,
  DollarSign,
  Smartphone,
} from "lucide-react";

function sanitizeConfig(input: AppConfig): AppConfig {
  return {
    ...appConfigDefaults,
    ...input,
  };
}

export default function AdminPage() {
  const [password, setPassword] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [config, setConfig] = React.useState<AppConfig>(appConfigDefaults);
  const { setConfig: setRuntimeConfig } = useAppConfig();
  const [isBusy, setIsBusy] = React.useState(false);
  const [selectedFileName, setSelectedFileName] = React.useState("");

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState("");
  const [newPasswordInput, setNewPasswordInput] = React.useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const stored = await db.settings.get("admin-password");
      if (!stored?.value) {
        await db.settings.put({ key: "admin-password", value: "admin1234" });
      }
      const appConfig = await getAppConfig();
      setConfig(appConfig);
    };
    void load();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const stored = await db.settings.get("admin-password");
    const currentPass = stored?.value || "admin1234";

    if (password === currentPass) {
      setIsAuthenticated(true);
      toast.success("Admin access granted.");
    } else {
      toast.error("Incorrect local admin password.");
    }
  };

  const handleSavePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = await db.settings.get("admin-password");
    const currentPass = stored?.value || "admin1234";

    if (currentPasswordInput !== currentPass) {
      toast.error("Current password is incorrect.");
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 4) {
      toast.error("New password must be at least 4 characters.");
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      toast.error("New passwords do not match.");
      return;
    }

    await db.settings.put({ key: "admin-password", value: newPasswordInput });
    toast.success("Admin password updated successfully.");
    setShowPasswordModal(false);
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setConfirmPasswordInput("");
  };

  const handleSaveConfig = async () => {
    try {
      setIsBusy(true);
      const validated = sanitizeConfig(config);
      await saveAppConfig(validated);
      setConfig(validated);
      setRuntimeConfig(validated);
      toast.success("Admin configuration saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      setIsBusy(true);
      const json = await exportAppConfig();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "config.json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Configuration exported to config.json.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsBusy(true);
      const content = await file.text();
      const parsed = await importAppConfig(content);
      setConfig(parsed);
      setRuntimeConfig(parsed);
      setSelectedFileName(file.name);
      toast.success("Configuration imported successfully.");
    } catch (error) {
      toast.error(`Import error: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetConfig = async () => {
    try {
      setIsBusy(true);
      const defaults = await resetAppConfig();
      setConfig(defaults);
      setRuntimeConfig(defaults);
      toast.success("Configuration reset to initial defaults.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsBusy(false);
    }
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-24">
        <GradientHeader
          title="Admin Panel Login"
          description="Manage application settings locally with a password stored in IndexedDB."
          showBackButton
        />
        <main className="mx-auto max-w-md px-4 py-8">
          <Card className="space-y-5 shadow-lg">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-bold">Local Admin Access</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This panel only manages app configuration and does not access family data automatically.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground pl-1">Admin Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter local admin password"
                  autoFocus
                />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Authenticate
              </Button>
            </form>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <GradientHeader
        title="Admin Panel"
        description="Update app-wide settings for the offline experience. Stored locally in IndexedDB."
        showBackButton
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)} className="gap-1.5">
            <Key className="h-4 w-4 text-amber-500" />
            Change Password
          </Button>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ================================================= */}
        {/* ACTION BAR (Save, Export, Import, Reset)          */}
        {/* ================================================= */}
        <Card className="shadow-md bg-card/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Settings2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">Configuration Controls</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Local Admin Active
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/40">
            <Button variant="primary" onClick={() => void handleSaveConfig()} disabled={isBusy} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Save Configuration
            </Button>
            <Button variant="secondary" onClick={() => void handleExportConfig()} disabled={isBusy} className="gap-2">
              <Download className="h-4 w-4" />
              Export Config (config.json)
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isBusy} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Config JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button variant="danger" onClick={() => void handleResetConfig()} disabled={isBusy} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Config
            </Button>
          </div>

          {selectedFileName && (
            <p className="text-xs text-muted-foreground pt-2">Last imported file: {selectedFileName}</p>
          )}
        </Card>

        {/* ================================================= */}
        {/* GENERAL BRANDING & COLORS                         */}
        {/* ================================================= */}
        <Card className="shadow-md space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Sliders className="h-5 w-5" />
            <h2 className="text-lg font-bold">App Identity & Colors</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">App Name</label>
              <Input
                value={config.appName}
                onChange={(e) => setConfig((prev) => ({ ...prev, appName: e.target.value }))}
                placeholder="My Family"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">App Logo Path</label>
              <Input
                value={config.appLogo}
                onChange={(e) => setConfig((prev) => ({ ...prev, appLogo: e.target.value }))}
                placeholder="/icons/icon-192x192.png"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Primary Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-14 h-11 p-1 cursor-pointer"
                />
                <Input
                  value={config.primaryColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#2563eb"
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Secondary Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-14 h-11 p-1 cursor-pointer"
                />
                <Input
                  value={config.secondaryColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#10b981"
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Select
                label="Default Theme"
                options={[
                  { value: "light", label: "Light Theme" },
                  { value: "dark", label: "Dark Theme" },
                  { value: "system", label: "System Default" },
                ]}
                value={config.defaultTheme}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, defaultTheme: e.target.value as AppConfig["defaultTheme"] }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">App Version</label>
              <Input
                value={config.appVersion}
                onChange={(e) => setConfig((prev) => ({ ...prev, appVersion: e.target.value }))}
                placeholder="1.0.0"
              />
            </div>
          </div>
        </Card>

        {/* ================================================= */}
        {/* ANNOUNCEMENT & MAINTENANCE MODE                  */}
        {/* ================================================= */}
        <Card className="shadow-md space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Megaphone className="h-5 w-5" />
            <h2 className="text-lg font-bold">Announcement & Maintenance</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Announcement Bar Message</label>
              <Input
                value={config.announcementBar}
                onChange={(e) => setConfig((prev) => ({ ...prev, announcementBar: e.target.value }))}
                placeholder="e.g. Welcome to My Family offline tree builder!"
              />
            </div>

            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Maintenance Mode</span>
                <span className="text-xs text-muted-foreground">Displays maintenance screen to users.</span>
              </div>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>
          </div>
        </Card>

        {/* ================================================= */}
        {/* CONTENT MANAGEMENT (About, Privacy, Terms)       */}
        {/* ================================================= */}
        <Card className="shadow-md space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Info className="h-5 w-5" />
            <h2 className="text-lg font-bold">Content & Legal Texts</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Contact Information</label>
              <Input
                value={config.contactInformation}
                onChange={(e) => setConfig((prev) => ({ ...prev, contactInformation: e.target.value }))}
                placeholder="e.g. support@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">About Content</label>
              <Textarea
                rows={3}
                value={config.aboutContent}
                onChange={(e) => setConfig((prev) => ({ ...prev, aboutContent: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Privacy Policy Content</label>
              <Textarea
                rows={3}
                value={config.privacyContent}
                onChange={(e) => setConfig((prev) => ({ ...prev, privacyContent: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Terms & Conditions Content</label>
              <Textarea
                rows={3}
                value={config.termsContent}
                onChange={(e) => setConfig((prev) => ({ ...prev, termsContent: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* ================================================= */}
        {/* ADS SETTINGS                                      */}
        {/* ================================================= */}
        <Card className="shadow-md space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
            <h2 className="text-lg font-bold">Ads Settings</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Enable Ads</span>
                <span className="text-xs text-muted-foreground">Enable ad placements.</span>
              </div>
              <input
                type="checkbox"
                checked={config.adsEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, adsEnabled: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Test Mode</span>
                <span className="text-xs text-muted-foreground">Display placeholder ad boxes.</span>
              </div>
              <input
                type="checkbox"
                checked={config.testMode}
                onChange={(e) => setConfig((prev) => ({ ...prev, testMode: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>

            <Select
              label="Ad Provider"
              options={[
                { value: "none", label: "None" },
                { value: "google-adsense", label: "Google AdSense" },
                { value: "custom-html", label: "Custom HTML Code" },
              ]}
              value={config.adsProvider}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, adsProvider: e.target.value as AppConfig["adsProvider"] }))
              }
            />

            <Select
              label="Ad Type"
              options={[
                { value: "banner", label: "Banner Ad" },
                { value: "native", label: "Native Ad" },
                { value: "interstitial", label: "Interstitial Placeholder" },
                { value: "placeholder", label: "Placeholder Box" },
              ]}
              value={config.adsType}
              onChange={(e) => setConfig((prev) => ({ ...prev, adsType: e.target.value as AppConfig["adsType"] }))}
            />

            <Select
              label="Ad Position"
              options={[
                { value: "top", label: "Top Header" },
                { value: "middle", label: "Middle Content" },
                { value: "bottom", label: "Bottom Footer" },
                { value: "sidebar", label: "Sidebar" },
              ]}
              value={config.adPosition}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, adPosition: e.target.value as AppConfig["adPosition"] }))
              }
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Ad Frequency (1 - 10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={config.adFrequency}
                onChange={(e) => setConfig((prev) => ({ ...prev, adFrequency: Number(e.target.value) }))}
              />
            </div>

            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Responsive Ads</span>
                <span className="text-xs text-muted-foreground">Adapt ad sizes automatically.</span>
              </div>
              <input
                type="checkbox"
                checked={config.responsiveAds}
                onChange={(e) => setConfig((prev) => ({ ...prev, responsiveAds: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Custom Ad Code</label>
              <Textarea
                rows={2}
                value={config.customAdCode}
                onChange={(e) => setConfig((prev) => ({ ...prev, customAdCode: e.target.value }))}
                placeholder="Insert HTML/JS ad snippet"
              />
            </div>
          </div>
        </Card>

        {/* ================================================= */}
        {/* PWA & OFFLINE SETTINGS                            */}
        {/* ================================================= */}
        <Card className="shadow-md space-y-4">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Smartphone className="h-5 w-5" />
            <h2 className="text-lg font-bold">PWA & Offline Controls</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">PWA Enabled</span>
                <span className="text-xs text-muted-foreground">Service worker active.</span>
              </div>
              <input
                type="checkbox"
                checked={config.pwaEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, pwaEnabled: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Install Prompt</span>
                <span className="text-xs text-muted-foreground">Prompt user to install.</span>
              </div>
              <input
                type="checkbox"
                checked={config.installPromptEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, installPromptEnabled: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/70 cursor-pointer">
              <div>
                <span className="text-sm font-bold text-foreground block">Offline Mode</span>
                <span className="text-xs text-muted-foreground">Enable cache-first offline.</span>
              </div>
              <input
                type="checkbox"
                checked={config.offlineModeEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, offlineModeEnabled: e.target.checked }))}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </label>
          </div>
        </Card>
      </main>

      <BottomNavigation />

      {/* Password Change Dialog */}
      <Dialog
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Admin Password"
      >
        <form onSubmit={handleSavePasswordChange} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
            <Input
              type="password"
              value={currentPasswordInput}
              onChange={(e) => setCurrentPasswordInput(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">New Password</label>
            <Input
              type="password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Enter new password (min 4 chars)"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPasswordInput}
              onChange={(e) => setConfirmPasswordInput(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update Password
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
