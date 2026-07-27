"use client";

import * as React from "react";
import { GradientHeader } from "@/components/layout/headers";
import { BottomNavigation } from "@/components/layout/navigation";
import { BackupManager } from "@/components/backup/backup-manager";

export default function BackupPage() {
  return (
    <div className="min-h-screen pb-24 bg-background text-foreground transition-colors duration-200">
      <GradientHeader
        title="Backup System"
        description="Export entire app, single family, or settings to JSON. Validate & preview backups, merge or replace data safely offline."
        showBackButton={true}
      />

      <main className="max-w-5xl mx-auto px-4 md:px-8">
        <BackupManager />
      </main>

      <BottomNavigation />
    </div>
  );
}
