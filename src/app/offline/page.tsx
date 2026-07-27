"use client";

import * as React from "react";
import { WifiOff, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <Card className="w-full space-y-5 p-6 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <WifiOff className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">You are offline</h1>
            <p className="text-sm text-muted-foreground">
              Your family tree and settings are still available locally on this device. Try again once your connection is restored.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
