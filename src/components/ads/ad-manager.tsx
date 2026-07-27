"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MonitorSmartphone, Sparkles, BadgeInfo, X, DollarSign } from "lucide-react";
import { useAppConfig } from "@/hooks/use-app-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdManagerProps {
  placement?: "top" | "middle" | "bottom" | "sidebar";
  className?: string;
}

export function AdManager({ placement = "bottom", className }: AdManagerProps) {
  const { config } = useAppConfig();
  const [showInterstitial, setShowInterstitial] = React.useState(false);

  // Frequency counter for interstitial triggers
  React.useEffect(() => {
    if (
      config.adsEnabled &&
      config.adPosition === placement &&
      config.adsType === "interstitial"
    ) {
      const timer = setTimeout(() => {
        setShowInterstitial(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [config.adsEnabled, config.adPosition, config.adsType, placement]);

  // 1. If ads are disabled globally or provider is none, hide container completely
  if (!config.adsEnabled || config.adsProvider === "none") {
    return null;
  }

  // 2. Hide container if ad position does not match requested placement
  if (config.adPosition && placement !== config.adPosition) {
    return null;
  }

  // 3. Render Interstitial Modal
  if (config.adsType === "interstitial") {
    if (!showInterstitial) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border/50 text-foreground space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Sponsored Interstitial</span>
              </div>
              <button
                onClick={() => setShowInterstitial(false)}
                className="p-1 rounded-xl hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close ad"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {config.testMode ? (
              <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-2">
                <BadgeInfo className="h-8 w-8 text-primary mx-auto" />
                <h4 className="font-bold text-foreground text-sm">Interstitial Test Ad Placeholder</h4>
                <p className="text-xs text-muted-foreground">
                  Provider: <span className="font-mono font-semibold uppercase">{config.adsProvider}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  (Test mode active. Configure live script in Admin Panel.)
                </p>
              </div>
            ) : config.adsProvider === "custom-html" && config.customAdCode ? (
              <div dangerouslySetInnerHTML={{ __html: config.customAdCode }} />
            ) : (
              <div className="p-4 rounded-2xl bg-muted/40 text-center text-xs text-muted-foreground">
                Google AdSense Interstitial Slot Active
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={() => setShowInterstitial(false)}>
                Close Ad
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // 4. Render Banner or Native Ad Slot
  const isNative = config.adsType === "native";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "my-4 overflow-hidden transition-all select-none",
        isNative
          ? "rounded-3xl border border-primary/20 bg-card/90 p-5 shadow-md"
          : "rounded-2xl border border-border/50 bg-card/60 p-4 shadow-xs",
        config.responsiveAds ? "w-full" : "max-w-md mx-auto",
        placement === "sidebar" ? "max-w-xs" : "",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {config.adsProvider === "google-adsense" ? (
            <MonitorSmartphone className="h-3.5 w-3.5 text-primary" />
          ) : (
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span>{config.adsProvider === "google-adsense" ? "Google AdSense" : "Advertisement"}</span>
        </div>
        {config.testMode && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
            Test Mode
          </span>
        )}
      </div>

      {config.adsProvider === "custom-html" ? (
        config.customAdCode ? (
          <div dangerouslySetInnerHTML={{ __html: config.customAdCode }} />
        ) : (
          <div className="p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
            Custom HTML Ad Slot ready. Enter code in Admin Panel.
          </div>
        )
      ) : config.adsProvider === "google-adsense" ? (
        <div className="p-4 rounded-xl bg-primary/5 border border-dashed border-primary/30 text-center space-y-1">
          <p className="text-xs font-bold text-foreground">Google AdSense Placement ({config.adsType})</p>
          <p className="text-[11px] text-muted-foreground">
            Responsive: {config.responsiveAds ? "Enabled" : "Disabled"} | Position: {config.adPosition}
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
          Advertisement space configured.
        </div>
      )}
    </motion.div>
  );
}
