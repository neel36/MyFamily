# Deployment Guide

**My Family** is engineered for zero-config deployment to Vercel, Netlify, or any static hosting service. Because all data is stored offline inside the browser's IndexedDB, no external servers or environment variables are required.

---

## Deploying to Vercel

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push your repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `my-family` repository.
4. Keep framework setting as **Next.js**.
5. Click **Deploy**.

Vercel will run `npm run build` and deploy the application automatically.

---

## Deploying to GitHub Pages / Static Server

1. Build the production output:
   ```bash
   npm run build
   ```
2. The output in `.next` is ready for deployment.
