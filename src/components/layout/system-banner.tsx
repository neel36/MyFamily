"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAppConfig } from "@/hooks/use-app-config";
import { Megaphone, Wrench, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AnnouncementBanner() {
  const { config } = useAppConfig();
  const [dismissed, setDismissed] = React.useState(false);

  if (!config.announcementBar || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-2 px-4 shadow-xs select-none">
      <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 text-xs md:text-sm font-semibold">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-100" />
          <span className="truncate">{config.announcementBar}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer shrink-0"
          aria-label="Close announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MaintenanceModeGuard({ children }: { children: React.ReactNode }) {
  const { config } = useAppConfig();
  const pathname = usePathname();
  const router = useRouter();

  const isAdminPage = pathname.startsWith("/admin");

  if (config.maintenanceMode && !isAdminPage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-amber-500/30">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wrench className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Maintenance Mode Active</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.appName} is currently undergoing scheduled local maintenance or configuration updates.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Local Maintenance</p>
            <p className="mt-0.5">Application data remains safely stored in your browser&apos;s IndexedDB.</p>
          </div>

          <Button variant="outline" className="w-full justify-center gap-2" onClick={() => router.push("/admin")}>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            Access Admin Panel
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
