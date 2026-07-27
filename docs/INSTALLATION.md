# Installation Guide

This guide provides step-by-step instructions for setting up **My Family** locally on your development machine or server.

---

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18.0.0+ (LTS recommended)
- **npm**: v9.0.0+

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/my-family.git
cd my-family
```

---

## Step 2: Install Dependencies

Install project dependencies using `npm`:

```bash
npm install
```

---

## Step 3: Run Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` to launch the application.

---

## Step 4: Verification Commands

Ensure all build and lint checks pass cleanly:

```bash
# Run ESLint
npm run lint

# Compile production build
npm run build
```

---

## Troubleshooting

- **Service Worker / PWA Issues**: Clear browser application storage or test in Incognito mode if service worker cache is stale.
- **Port Conflict**: If port 3000 is occupied, run `PORT=3001 npm run dev`.
