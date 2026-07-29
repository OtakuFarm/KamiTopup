# KamiTopup – Deployment & CI/CD Guide

## Architecture

```
GitHub (main branch)
    │
    ├── Frontend changes  →  GitHub Actions  →  Vercel
    └── Backend changes   →  GitHub Actions  →  Railway
```

---

## 1. One-time Setup

### A. Push the project to GitHub

```bash
cd game-topup-site
git init
git add .
git commit -m "Initial KamiTopup release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kamitopup.git
git push -u origin main
```

### B. Backend – Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the repo and set the **root directory** to `backend`
3. Add all environment variables from `.env.example`
4. Generate a public domain (Settings → Networking)
5. Create a **Project Token** or **Account Token**:
   - Account Settings → Tokens → Create
6. Copy the token

### C. Frontend – Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import the same GitHub repo
2. Framework Preset: **Other**
3. Root Directory: leave empty (or `.`)
4. Deploy
5. Go to Account Settings → Tokens → Create (scope: full account)
6. Also note:
   - `VERCEL_ORG_ID` (Team / Personal settings)
   - `VERCEL_PROJECT_ID` (Project → Settings → General)

### D. GitHub Secrets

In your GitHub repo → **Settings → Secrets and variables → Actions** → New repository secret:

| Secret Name            | Value                                      |
|------------------------|--------------------------------------------|
| `RAILWAY_TOKEN`        | Railway account/project token              |
| `VERCEL_TOKEN`         | Vercel token                               |
| `VERCEL_ORG_ID`        | Your Vercel org/user ID                    |
| `VERCEL_PROJECT_ID`    | Your Vercel project ID                     |

Optional:
| `RAILWAY_SERVICE_ID`   | Specific Railway service ID                |
| `RENDER_DEPLOY_HOOK_URL` | If using Render instead of Railway       |

---

## 2. What the Pipelines Do

### `ci.yml` (every push & PR)
- Checks backend syntax
- Verifies required files exist
- Fast feedback before merge

### `deploy-backend.yml`
- Runs when files under `backend/` change
- Installs dependencies
- Deploys to Railway automatically

### `deploy-frontend.yml`
- Runs when frontend files change
- Builds and deploys to Vercel production

You can also trigger any workflow manually from the **Actions** tab → “Run workflow”.

---

## 3. After First Deploy

1. Update frontend API base URL to your Railway backend:
   ```js
   const API_BASE = 'https://your-backend.up.railway.app/api';
   ```
2. Set `FRONTEND_URL` in Railway to your Vercel domain
3. Add your domain in both Vercel and Railway (optional but recommended)
4. Test:
   - `https://your-frontend.vercel.app`
   - `https://your-backend.up.railway.app/api/health`
   - Admin: `https://your-backend.up.railway.app/admin`

---

## 4. Alternative: Render (Backend)

If you prefer Render over Railway:

1. Create a **Web Service** on Render linked to the repo
2. Root directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables
6. Create a **Deploy Hook** and put the URL in GitHub secret `RENDER_DEPLOY_HOOK_URL`
7. Uncomment the Render step in `deploy-backend.yml`

---

## 5. Local Development vs Production

| Environment | Frontend              | Backend                     |
|-------------|-----------------------|-----------------------------|
| Local       | Open `index.html`     | `cd backend && npm start`   |
| Production  | Vercel                | Railway / Render            |

Never put real live keys in the frontend code that is committed.  
Only the **publishable** Stripe key and reCAPTCHA **site key** belong in the frontend.

---

## 6. Recommended Workflow

1. Develop locally
2. Commit & push to `main`
3. GitHub Actions runs CI + deploys automatically
4. Check the Actions tab for success/failure
5. Test the live site

---

## 7. Troubleshooting

| Problem                    | Fix                                              |
|----------------------------|--------------------------------------------------|
| Railway deploy fails       | Check `RAILWAY_TOKEN` and service ID             |
| Vercel deploy fails        | Verify `VERCEL_TOKEN`, `ORG_ID`, `PROJECT_ID`    |
| CORS errors                | Set `FRONTEND_URL` correctly on backend          |
| Admin not loading          | Confirm backend is up and `/admin` is reachable  |
| reCAPTCHA not working      | Add your live domain in Google reCAPTCHA admin   |

---

You now have a fully automated pipeline.  
Push to `main` → site updates automatically.
