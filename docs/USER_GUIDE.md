# User Guide

Welcome to **My Family**, your private, offline family tree builder and management software.

---

## 1. Getting Started

- **Navigation**: Use the bottom navigation bar (on mobile) or top header buttons (on desktop) to switch between **Home**, **Families**, **Tree**, **Members**, **Backup**, **Admin**, and **Settings**.
- **100% Offline Guarantee**: You do not need an internet connection. All data stays strictly in your browser.

---

## 2. Managing Families & Members

1. **Creating a Family**:
   - Go to **Families** or click **New Family** on the Home screen.
   - Enter a family name, description, and color theme.
2. **Adding Members**:
   - Go to **Members** or open a Family detail view.
   - Fill in member details (name, gender, birth date, death date, parents, spouse, occupation, address, photo).
3. **Viewing Family Tree**:
   - Navigate to **Tree** to explore interactive tree diagrams and lineage links.

---

## 3. Backup System (`/backup` & `/settings`)

- **Export Data**: Choose between **Entire Application**, **Single Family**, or **Settings Only** to download a formatted `.json` backup file.
- **Import Data**: Drop or select a `.json` backup file. Review validation status, backup date, size, family count, and member count.
- **Import Modes**:
  - **Merge**: Merges new items into your database without deleting existing records.
  - **Replace**: Clears database scope before importing records.
- **Automatic Backups**: An automatic snapshot is created in IndexedDB before any import or restore action.

---

## 4. Local Admin Panel (`/admin`)

- **Login**: Enter the default admin password (`admin1234`).
- **Change Password**: Click **Change Password** in the admin header to set a custom local password.
- **Customizations**: Update app name, branding colors, announcement banner, maintenance mode, legal text content, and advertisement provider options.
- **Config Backup**: Export or import application settings via `config.json`.
