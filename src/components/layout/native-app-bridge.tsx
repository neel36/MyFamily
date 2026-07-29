"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

export function NativeAppBridge() {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    let unbindBackButton: (() => void) | undefined;

    async function initNativePlugins() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { SplashScreen } = await import("@capacitor/splash-screen");

        // Hide splash screen smoothly after app is ready
        await SplashScreen.hide();

        // Configure status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0f5238" });

        // Hardware Back Button listener
        const backListener = await App.addListener("backButton", ({ canGoBack }) => {
          if (pathname === "/" || pathname === "/tree" || pathname === "/families" || !canGoBack) {
            App.minimizeApp();
          } else {
            router.back();
          }
        });

        unbindBackButton = () => {
          backListener.remove();
        };
      } catch (err) {
        console.warn("Capacitor native plugins initialization skipped:", err);
      }
    }

    initNativePlugins();

    return () => {
      unbindBackButton?.();
    };
  }, [pathname, router]);

  return null;
}
