## EmailtoReport – Installation and Production Guide

This doc covers local setup, Google/Gmail configuration, MongoDB, GitHub Actions cron, and deploying to production on an IONOS VPS using Dokploy.

### 1) Prerequisites
- Node.js 20+ and npm
- MongoDB Atlas cluster (have your connection string ready)
- Google Cloud project with Gmail API enabled
- Gmail account where emails arrive (e.g., `bsccl.ops@gmail.com`) and label "PDB Notifications"
- GitHub repository for this codebase
- IONOS VPS with Dokploy installed and reachable via a domain

### 2) Local development
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=REPLACE_WITH_LONG_RANDOM

   # MongoDB
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DB=emailtoreport

   # Google OAuth
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Gmail reading
   GMAIL_LABEL_NAME=PDB Notifications
   GMAIL_USER=bsccl.ops@gmail.com
   ```
   - Generate a strong `NEXTAUTH_SECRET`:
     ```bash
     openssl rand -base64 32
     ```

3. Start dev server:
   ```bash
   npm run dev
   ```
   - Open `http://localhost:3000`, click "Sign in" (Google), then "Sync Now".

### 3) Google Cloud & Gmail setup
1. In Google Cloud Console:
   - Enable "Gmail API".
   - Create OAuth 2.0 Client (Web app).
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env.local`.

2. In Gmail:
   - Ensure the label name exactly matches: `PDB Notifications`.

### 4) MongoDB Atlas setup
- Add your client IP to the Atlas IP Access List (for local testing). For GitHub Actions and VPS, either allow 0.0.0.0/0 temporarily or add the appropriate egress IPs.
- No schema prep needed; indexes are created automatically at runtime:
  - `emails.messageId` unique (dedup)
  - `outages.start`, and `outages.year/month/day`

### 5) Cron sync via GitHub Actions (no Vercel required)
The repo includes a workflow at `.github/workflows/cron.yml` that runs every 5 minutes and can be triggered manually.

1. In GitHub → Repo → Settings → Secrets and variables → Actions, add these secrets:
   - `MONGODB_URI` – your Atlas connection string
   - `MONGODB_DB` – `emailtoreport`
   - `GOOGLE_CLIENT_ID` – from GCP
   - `GOOGLE_CLIENT_SECRET` – from GCP
   - `GMAIL_REFRESH_TOKEN` – see below
   - `GMAIL_USER` – `bsccl.ops@gmail.com` or `me`
   - `GMAIL_LABEL_NAME` – `PDB Notifications`

2. Obtain a Gmail refresh token (one-time):
   - Use Google OAuth Playground or a small local OAuth script to authorize `https://www.googleapis.com/auth/gmail.readonly` with offline access.
   - Copy the `refresh_token` and save as `GMAIL_REFRESH_TOKEN` secret.

3. The workflow runs `npm run cron:sync`, executing `scripts/sync.js` to:
   - Read recent emails with the label.
   - Parse "PDB Down"/"PDB Up" subjects.
   - Upsert deduped events into `emails`.
   - Rebuild `outages` with durations.

4. Adjust schedule (optional):
   - Edit `.github/workflows/cron.yml` → `cron: '*/5 * * * *'`.

### 6) Production deployment on IONOS VPS (Dokploy)
There are two common ways with Dokploy: use its Node app template or build via Dockerfile. The Node template is simplest.

Option A: Dokploy Node app
1. In Dokploy UI, create a new Node.js application.
2. Connect to your GitHub repo (or provide the repository URL) and select the branch to deploy.
3. Build settings:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start`
   - Node version: `20`
   - Working directory: repo root
4. Expose port 3000, attach domain, and enable HTTPS.
5. Add environment variables in Dokploy (same keys as `.env.local`, but with production values):
   - `NEXTAUTH_URL=https://your-domain`
   - `NEXTAUTH_SECRET=<long-random>`
   - `MONGODB_URI`, `MONGODB_DB`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GMAIL_LABEL_NAME`, `GMAIL_USER`
6. Deploy. After build, app will be available at your domain.

Option B: Dockerfile (if you prefer containerized build)

Step B1) Add a production Dockerfile
1. Create a `Dockerfile` in the repo root:
   ```Dockerfile
   FROM node:20-alpine AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci

   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/public ./public
   COPY package*.json ./
   RUN npm ci --omit=dev
   EXPOSE 3000
   CMD ["npm","run","start"]
   ```

2. Create `.dockerignore` to keep images small and builds fast:
   ```gitignore
   .next
   node_modules
   .git
   .env*
   npm-debug.log*
   Dockerfile*
   .DS_Store
   ```

Step B2) Prepare production environment variables
1. Create a local file `.env.production.local` (do not commit):
   ```env
   NEXTAUTH_URL=https://your-domain
   NEXTAUTH_SECRET=REPLACE_WITH_LONG_RANDOM

   # MongoDB
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DB=emailtoreport

   # Google OAuth
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Gmail reading
   GMAIL_LABEL_NAME=PDB Notifications
   GMAIL_USER=bsccl.ops@gmail.com
   ```
2. In Google Cloud Console, add a production Authorized redirect URI:
   - `https://your-domain/api/auth/callback/google`

Step B3) Build and test the image locally (optional but recommended)
1. Build:
   ```bash
   docker build -t emailtoreport:latest .
   ```
2. Run (using your env file):
   ```bash
   docker run --rm -p 3000:3000 --env-file .env.production.local emailtoreport:latest
   ```
3. Open `http://localhost:3000` and verify the app works. Sign in with Google and press "Sync Now" once.

Step B4) Deploy with Dokploy using Dockerfile
1. In Dokploy, create a new application and choose the Docker (build from repo) option.
2. Repository settings:
   - Repository URL: your Git repo URL
   - Branch: main (or the branch you deploy)
   - Context: `.`
   - Dockerfile path: `Dockerfile`
3. Build settings:
   - No build args required
   - Set Node version via Dockerfile (already Node 20 in base image)
4. Environment variables: add the same keys/values as in `.env.production.local`:
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - `MONGODB_URI`, `MONGODB_DB`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GMAIL_LABEL_NAME`, `GMAIL_USER`
5. Networking:
   - Expose internal container port `3000`
   - Attach your domain to this app and enable HTTPS (Let’s Encrypt)
6. Deploy:
   - Trigger a build/deploy in Dokploy and wait for success
   - Visit `https://your-domain` and sign in with Google

Step B5) Optional: Use a container registry
If Dokploy should pull a prebuilt image instead of building:
1. Push the image to a registry (e.g., GHCR, Docker Hub):
   ```bash
   docker tag emailtoreport:latest ghcr.io/<owner>/emailtoreport:latest
   docker push ghcr.io/<owner>/emailtoreport:latest
   ```
2. In Dokploy, configure the Docker app to pull from that registry and provide registry credentials if private.
3. Keep environment variables in Dokploy as above.

Step B6) Post-deploy checks
1. Ensure `NEXTAUTH_URL` matches your HTTPS domain.
2. Confirm MongoDB Atlas network access includes your VPS egress IP.
3. In GCP, verify production redirect URI is set and saved.
4. Test sign-in and a manual sync; then rely on the GitHub Actions cron for ongoing ingestion.

### 7) Production checks
- Set `NEXTAUTH_URL` to your HTTPS domain (e.g., `https://new.alternativechoice.org`).
- Ensure MongoDB Atlas allows your VPS IP.
- Verify Google OAuth redirect URI in GCP: `https://new.alternativechoice.org/api/auth/callback/google`.
- Sign in via Google in production, click "Sync Now" once to validate.
- GitHub Actions cron runs independently of the app deployment, as long as secrets are set.

### 8) Operations
- Manual sync: from the home page, press "Sync Now" (requires login).
- Automated sync: GitHub Actions workflow every 5 minutes builds outages.
- Views:
  - Daily: `/daily`
  - Monthly: `/monthly`
  - Yearly: `/yearly`

### 9) Security & notes
- Do not commit secrets. Use `.env.local` locally, Dokploy environment variables in production, and GitHub Actions Secrets.
- The app dedupes by `emails.messageId` (unique index) to avoid double inserts.
- Outages are recalculated each sync for correctness. We can switch to incremental later.
- If you need charts or CSV export, they can be added on request.

### 10) Troubleshooting
- `client_id is required`: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` (and Dokploy in production).
- `MONGODB_URI is not set`: Ensure it exists in your environment.
- No data in dashboards: Sign in and click "Sync Now", or wait for cron.
- Gmail label not found: Check label name and account (`GMAIL_USER`).


