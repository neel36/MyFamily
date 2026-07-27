# Developer Guide

This document covers architecture, data schemas, IndexedDB integration, and extension points for **My Family**.

---

## 1. Core Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Framer Motion, Lucide React
- **Local Storage**: Dexie.js 4 (IndexedDB)
- **Schema Validation**: Zod
- **PWA**: `next-pwa` with Workbox Service Worker

---

## 2. IndexedDB Schemas (`src/database/index.ts` & `src/types/schema.ts`)

Dexie database instance `my-family` contains 4 tables:

```ts
this.version(2).stores({
  families: "id, name, createdAt",
  members: "id, familyId, name, gender, fatherId, motherId, spouseId, [familyId+id]",
  settings: "key",
  backups: "id, createdAt, backupType, fileName",
});
```

### Table Overview:
1. `families`: Family tree root containers (`id`, `name`, `description`, `color`, `createdAt`, `updatedAt`).
2. `members`: Individuals (`id`, `familyId`, `name`, `gender`, `dateOfBirth`, `dateOfDeath`, `fatherId`, `motherId`, `spouseId`, etc.).
3. `settings`: Key-value pairs for app configuration (`CONFIG_KEY = "app-config"`) and admin password (`"admin-password"`).
4. `backups`: Stored local backup snapshot records (`id`, `createdAt`, `name`, `backupType`, `size`, `familyCount`, `memberCount`, `settingCount`, `payload`, `fileName`).

---

## 3. Extension Points

- **i18n Translations**: `useSetting("language", "en")` is registered. String tables can be mapped directly to dictionary files.
- **Custom Ad Providers**: Add new provider types in `AdManager` (`src/components/ads/ad-manager.tsx`) and `appConfigSchema` (`src/types/schema.ts`).
