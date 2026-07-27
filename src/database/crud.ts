import { db } from "./index";
import { 
  Family, familySchema, 
  Member, memberSchema, 
  Setting, settingSchema 
} from "../types/schema";

// ==========================
// FAMILIES CRUD
// ==========================

/**
 * Throws if a family with the given name already exists (case-insensitive, trimmed).
 * Pass `excludeId` when updating to skip the current record.
 */
async function assertFamilyNameUnique(name: string, excludeId?: string): Promise<void> {
  const normalized = name.trim().toLowerCase();
  const families = await db.families.toArray();
  const duplicate = families.find(
    (f) => f.name.trim().toLowerCase() === normalized && f.id !== excludeId
  );
  if (duplicate) {
    throw new Error(`A family named "${duplicate.name}" already exists.`);
  }
}

export async function createFamily(data: Omit<Family, "createdAt" | "updatedAt">): Promise<string> {
  await assertFamilyNameUnique(data.name);

  const now = Date.now();
  const family: Family = {
    ...data,
    name: data.name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  // Validate using Zod
  familySchema.parse(family);

  await db.families.add(family);
  return family.id;
}

export async function getFamily(id: string): Promise<Family | undefined> {
  return await db.families.get(id);
}

export async function updateFamily(id: string, updates: Partial<Omit<Family, "id" | "createdAt" | "updatedAt">>): Promise<void> {
  const existing = await getFamily(id);
  if (!existing) throw new Error("Family not found");

  // Check for duplicate name only if name is being changed
  if (updates.name && updates.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
    await assertFamilyNameUnique(updates.name, id);
  }

  const updated: Family = {
    ...existing,
    ...updates,
    name: updates.name ? updates.name.trim() : existing.name,
    updatedAt: Date.now(),
  };

  familySchema.parse(updated);

  await db.families.put(updated);
}

/**
 * Creates a duplicate of an existing family with a new ID and "(Copy)" suffix.
 * Does NOT copy members — only the family metadata.
 */
export async function duplicateFamily(id: string): Promise<string> {
  const source = await getFamily(id);
  if (!source) throw new Error("Family not found");

  const now = Date.now();
  const newId = `family_${now}_${Math.random().toString(36).slice(2, 9)}`;

  // Find a unique copy name (e.g. "Smith Family (Copy)", "Smith Family (Copy 2)")
  const allFamilies = await db.families.toArray();
  const existingNames = new Set(allFamilies.map((f) => f.name.trim().toLowerCase()));
  let copyName = `${source.name} (Copy)`;
  let counter = 2;
  while (existingNames.has(copyName.toLowerCase())) {
    copyName = `${source.name} (Copy ${counter})`;
    counter++;
  }

  const duplicate: Family = {
    ...source,
    id: newId,
    name: copyName,
    createdAt: now,
    updatedAt: now,
  };

  familySchema.parse(duplicate);
  await db.families.add(duplicate);
  return newId;
}

/**
 * Deletes a family and all of its associated family members (cascade delete).
 */
export async function deleteFamily(id: string): Promise<void> {
  await db.transaction("rw", [db.families, db.members], async () => {
    // Delete all members belonging to the family
    await db.members.where("familyId").equals(id).delete();
    // Delete the family itself
    await db.families.delete(id);
  });
}

export async function listFamilies(): Promise<Family[]> {
  return await db.families.toArray();
}


// ==========================
// MEMBERS CRUD
// ==========================

/**
 * Checks if `ancestorId` is an ancestor of `personId`.
 * Uses a visited set to prevent infinite loops.
 */
function isAncestor(
  ancestorId: string,
  personId: string,
  membersMap: Map<string, Member>,
  visited = new Set<string>()
): boolean {
  if (ancestorId === personId) return true;
  if (visited.has(personId)) return false;
  visited.add(personId);

  const person = membersMap.get(personId);
  if (!person) return false;

  if (person.fatherId && isAncestor(ancestorId, person.fatherId, membersMap, visited)) return true;
  if (person.motherId && isAncestor(ancestorId, person.motherId, membersMap, visited)) return true;

  return false;
}

/**
 * Validates relationships and synchronizes spouse references inside a transaction.
 */
async function validateAndSyncMember(member: Member, isNew: boolean): Promise<void> {
  const allMembersList = await db.members.toArray();
  const membersMap = new Map<string, Member>(allMembersList.map((m) => [m.id, m]));

  // Self checks
  if (member.fatherId === member.id) throw new Error("A person cannot be their own father.");
  if (member.motherId === member.id) throw new Error("A person cannot be their own mother.");
  if (member.spouseId === member.id) throw new Error("A person cannot be their own spouse.");

  // Duplicate checks
  if (member.fatherId && member.motherId && member.fatherId === member.motherId) {
    throw new Error("Father and mother cannot be the same person.");
  }
  if (member.fatherId && member.spouseId && member.fatherId === member.spouseId) {
    throw new Error("Father cannot be the spouse.");
  }
  if (member.motherId && member.spouseId && member.motherId === member.spouseId) {
    throw new Error("Mother cannot be the spouse.");
  }

  // Family checks
  if (member.fatherId) {
    const f = membersMap.get(member.fatherId);
    if (!f) throw new Error("Father not found.");
    if (f.familyId !== member.familyId) throw new Error("Father must be in the same family.");
  }
  if (member.motherId) {
    const m = membersMap.get(member.motherId);
    if (!m) throw new Error("Mother not found.");
    if (m.familyId !== member.familyId) throw new Error("Mother must be in the same family.");
  }
  if (member.spouseId) {
    const s = membersMap.get(member.spouseId);
    if (!s) throw new Error("Spouse not found.");
    if (s.familyId !== member.familyId) throw new Error("Spouse must be in the same family.");
  }

  // Circular relationship checks
  if (member.fatherId && isAncestor(member.id, member.fatherId, membersMap)) {
    throw new Error("Circular relationship detected: Proposed father is a descendant.");
  }
  if (member.motherId && isAncestor(member.id, member.motherId, membersMap)) {
    throw new Error("Circular relationship detected: Proposed mother is a descendant.");
  }
  if (member.spouseId) {
    if (isAncestor(member.id, member.spouseId, membersMap)) {
      throw new Error("Proposed spouse is a descendant.");
    }
    if (isAncestor(member.spouseId, member.id, membersMap)) {
      throw new Error("Proposed spouse is an ancestor.");
    }
  }

  // Spouse synchronization
  const existing = isNew ? undefined : membersMap.get(member.id);
  const oldSpouseId = existing?.spouseId;
  const newSpouseId = member.spouseId;

  if (oldSpouseId !== newSpouseId) {
    // 1. Clear old spouse's reference to this member
    if (oldSpouseId) {
      const os = membersMap.get(oldSpouseId);
      if (os && os.spouseId === member.id) {
        os.spouseId = undefined;
        os.updatedAt = Date.now();
        await db.members.put(os);
      }
    }

    // 2. Set new spouse's reference to this member (and break their previous marriage if any)
    if (newSpouseId) {
      const ns = membersMap.get(newSpouseId);
      if (ns) {
        const nsPrevSpouse = ns.spouseId;
        if (nsPrevSpouse && nsPrevSpouse !== member.id) {
          const nsp = membersMap.get(nsPrevSpouse);
          if (nsp) {
            nsp.spouseId = undefined;
            nsp.updatedAt = Date.now();
            await db.members.put(nsp);
          }
        }
        ns.spouseId = member.id;
        ns.updatedAt = Date.now();
        await db.members.put(ns);
      }
    }
  }
}

export async function createMember(data: Omit<Member, "createdAt" | "updatedAt">): Promise<string> {
  const now = Date.now();
  const member: Member = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  // Validate using Zod
  memberSchema.parse(member);

  await db.transaction("rw", [db.members], async () => {
    await validateAndSyncMember(member, true);
    await db.members.add(member);
  });

  return member.id;
}

export async function getMember(id: string): Promise<Member | undefined> {
  return await db.members.get(id);
}

export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, "id" | "familyId" | "createdAt" | "updatedAt">>
): Promise<void> {
  await db.transaction("rw", [db.members], async () => {
    const existing = await getMember(id);
    if (!existing) throw new Error("Member not found");

    const updated: Member = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    memberSchema.parse(updated);
    await validateAndSyncMember(updated, false);
    await db.members.put(updated);
  });
}

/**
 * Connects a relationship between two members, executing all necessary circular checks and reverse links.
 */
export async function connectRelationship(
  personId: string,
  relativeId: string,
  relationshipType: "father" | "mother" | "husband" | "wife" | "son" | "daughter"
): Promise<void> {
  await db.transaction("rw", [db.members], async () => {
    const person = await getMember(personId);
    const relative = await getMember(relativeId);

    if (!person || !relative) throw new Error("Members not found.");
    if (person.familyId !== relative.familyId) {
      throw new Error("Members must belong to the same family.");
    }

    if (relationshipType === "father") {
      await updateMember(personId, { fatherId: relativeId });
    } else if (relationshipType === "mother") {
      await updateMember(personId, { motherId: relativeId });
    } else if (relationshipType === "husband" || relationshipType === "wife") {
      await updateMember(personId, { spouseId: relativeId });
    } else if (relationshipType === "son" || relationshipType === "daughter") {
      // Set parentId of the child to the parent
      if (person.gender === "female") {
        await updateMember(relativeId, { motherId: personId });
      } else {
        // Default to father if male or other/unspecified
        await updateMember(relativeId, { fatherId: personId });
      }
    }
  });
}

/**
 * Deletes a member and cleans up relationship references (fatherId, motherId, spouseId) in other members.
 */
export async function deleteMember(id: string): Promise<void> {
  await db.transaction("rw", [db.members], async () => {
    // 1. Clean up references in other members
    await db.members
      .where("fatherId")
      .equals(id)
      .modify({ fatherId: undefined });

    await db.members
      .where("motherId")
      .equals(id)
      .modify({ motherId: undefined });

    await db.members
      .where("spouseId")
      .equals(id)
      .modify({ spouseId: undefined });

    // 2. Delete the member
    await db.members.delete(id);
  });
}

export async function listMembersByFamily(familyId: string): Promise<Member[]> {
  return await db.members.where("familyId").equals(familyId).toArray();
}

// ==========================
// SETTINGS CRUD
// ==========================

export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  const setting = await db.settings.get(key);
  if (setting) {
    return setting.value as T;
  }
  return defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const setting: Setting = { key, value };
  settingSchema.parse(setting);
  await db.settings.put(setting);
}

export async function resetEntireApp(): Promise<void> {
  await db.transaction("rw", [db.families, db.members, db.settings, db.backups], async () => {
    await db.families.clear();
    await db.members.clear();
    await db.settings.clear();
    await db.backups.clear();
  });
}

