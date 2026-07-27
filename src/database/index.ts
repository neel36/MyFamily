import Dexie, { type Table } from "dexie";
import { BackupRecord, Family, Member, Setting } from "../types/schema";

export class MyFamilyDatabase extends Dexie {
  families!: Table<Family, string>;
  members!: Table<Member, string>;
  settings!: Table<Setting, string>;
  backups!: Table<BackupRecord, string>;

  constructor() {
    super("my-family");
    this.version(2).stores({
      families: "id, name, createdAt",
      members: "id, familyId, name, gender, fatherId, motherId, spouseId, [familyId+id]",
      settings: "key",
      backups: "id, createdAt, backupType, fileName",
    });
  }
}

export const db = new MyFamilyDatabase();
export default db;
