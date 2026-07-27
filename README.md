# My Family - Privacy-First Offline Family Tree Builder & Management System

**My Family** is a modern, privacy-first, 100% offline web application built with Next.js, React, Tailwind CSS, TypeScript, Dexie.js (IndexedDB), and PWA service workers.

Designed for individuals and families who want full control over their genealogical records without cloud trackers, server signups, or data selling.

---

## 🌟 Key Features

- **🔒 100% Offline & Privacy-First**: All family records, member details, relationships, and app settings stay inside your browser's IndexedDB. Zero network requests or cloud databases required.
- **🌳 Interactive Family Tree**: Visualize multi-generational family trees, parent-child links, spouse relationships, and rich member profiles.
- **💾 Complete Backup System**:
  - Export Entire Application, Single Family, or Settings to formatted JSON files.
  - Drag-and-drop file upload with structure & schema validation.
  - Detailed error messages for corrupted/invalid files.
  - Data preview card showing export date, size, family count, member count, and settings count.
  - **Merge Existing Data** or **Replace Existing Data** import modes.
  - Automatic pre-import safety backups saved in local IndexedDB history.
- **⚙️ Settings & System Management**: Theme selection (Light, Dark, System), Language preferences (i18n ready), storage metrics, and application reset.
- **🛡️ Local Admin Panel (`/admin`)**:
  - Password-protected with local password stored in IndexedDB (Default password: `admin1234`).
  - Manage app identity, logo, primary/secondary colors, announcement banner, maintenance mode, legal texts, and PWA options.
- **📢 Advertisement Management**:
  - Provider support for Google AdSense and Custom HTML ads.
  - Formats: Banner, Native, and Interstitial Placeholder.
  - Admin controls for Enable/Disable, Position, Frequency, Responsive, Custom Code, and Test Mode.
- **📱 Progressive Web App (PWA)**:
  - Installable PWA with custom manifest, service worker caching, and offline fallback route (`/offline`).

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-username/my-family.git
cd my-family

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Commands

```bash
# Run ESLint check (0 errors, 0 warnings)
npm run lint

# Build production bundle with Next.js & TypeScript check
npm run build

# Start production server locally
npm run start
```

---

## 📚 Documentation Index

Detailed documentation files are available in the [`docs/`](./docs) folder:

- [Installation Guide](./docs/INSTALLATION.md): Detailed environment setup, dependency management, and trouble-shooting.
- [Project Structure Document](./docs/PROJECT_STRUCTURE.md): Codebase layout, component hierarchy, and file responsibilities.
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md): Zero-config deployment instructions for Vercel, GitHub Pages, and static hosts.
- [User Guide](./docs/USER_GUIDE.md): End-user manual covering family creation, tree viewing, backups, and settings.
- [Developer Guide](./docs/DEVELOPER_GUIDE.md): Architecture breakdown, IndexedDB Dexie schemas, PWA configuration, and extension points.

---

## 🛡️ License

This project is open-source under the MIT License.
