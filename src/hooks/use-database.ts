"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/database";
import { setSetting } from "@/database/crud";
import { Family, Member } from "@/types/schema";

/**
 * Hook to reactively fetch all families.
 */
export function useFamilies() {
  return useLiveQuery(
    async () => {
      return await db.families.toArray();
    },
    [],
    [] as Family[]
  );
}

/**
 * Hook to reactively fetch a single family by ID.
 */
export function useFamily(id: string) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return await db.families.get(id);
    },
    [id],
    undefined
  );
}

/**
 * Hook to reactively fetch all members.
 */
export function useMembers() {
  return useLiveQuery(
    async () => {
      return await db.members.toArray();
    },
    [],
    [] as Member[]
  );
}

/**
 * Hook to reactively fetch all members of a family.
 */
export function useFamilyMembers(familyId: string) {
  return useLiveQuery(
    async () => {
      if (!familyId) return [];
      return await db.members.where("familyId").equals(familyId).toArray();
    },
    [familyId],
    [] as Member[]
  );
}

/**
 * Hook to reactively get the total member count for a single family.
 */
export function useFamilyMemberCount(familyId: string): number {
  return useLiveQuery(
    async () => {
      if (!familyId) return 0;
      return await db.members.where("familyId").equals(familyId).count();
    },
    [familyId],
    0
  ) ?? 0;
}


/**
 * Hook to reactively fetch a single member by ID.
 */
export function useMember(id: string) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return await db.members.get(id);
    },
    [id],
    undefined
  );
}

/**
 * Hook to reactively access and update a setting.
 */
export function useSetting<T>(key: string, defaultValue?: T) {
  const value = useLiveQuery(
    async () => {
      const setting = await db.settings.get(key);
      return setting ? (setting.value as T) : defaultValue;
    },
    [key],
    defaultValue
  );

  const updateSetting = async (newValue: T) => {
    await setSetting(key, newValue);
  };

  return [value, updateSetting] as const;
}
