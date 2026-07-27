"use client";

import { useAppConfigContext } from "@/components/app-config-provider";

export function useAppConfig() {
  return useAppConfigContext();
}
