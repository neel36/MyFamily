export interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export type Gender = "male" | "female" | "other";

export interface FamilyMember {
  id: string;
  treeId: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string; // YYYY-MM-DD
  deathDate?: string; // YYYY-MM-DD
  birthPlace?: string;
  currentLocation?: string;
  occupation?: string;
  biography?: string;
  photoUrl?: string; // Base64 encoded image string for local offline storage
  isDeceased: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RelationshipType = "spouse" | "parent-child";

export interface Relationship {
  id: string;
  treeId: string;
  personId1: string; // If parent-child, personId1 is parent, personId2 is child. If spouse, ordering doesn't matter.
  personId2: string;
  type: RelationshipType;
  marriageDate?: string;
  divorceDate?: string;
  isDivorced?: boolean;
}
