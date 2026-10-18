# LinkPulse Local Development Setup Guide

Follow these numbered steps to get a complete LinkPulse development environment running in under 20 minutes.

## 1. Prerequisites
Ensure you have the following installed on your computer:
- Node.js (version 20.x or 22.x)
- Git
- npm (version 10.x or newer)

## 2. Step-by-Step Setup

### Step 1: Clone the Repository
Clone the project repository and navigate into the project root:
```bash
git clone https://github.com/tejas0629/LinkPulse-URL-Shortener-Analytics-Platform-CodeXplorer-.git linkpulse
cd linkpulse
```

### Step 2: Configure Git Identity
Set your local git identity using the email address linked to your GitHub account:
```bash
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

### Step 3: Install Project Dependencies
Install all npm packages:
```bash
npm install
```

### Step 4: Create a Supabase PostgreSQL Database
Note: Supabase is used ONLY as PostgreSQL through Prisma. LinkPulse does not use Supabase Auth, Storage, Realtime, or supabase-js.
Rule: Each team member creates their own free Supabase project for local development. Only Tejas (Team Lead) runs migrations on the shared production database.

1. Go to https://supabase.com, sign in, and click "New project".
2. Name your project (such as "linkpulse-dev"), set a database password, and pick a region close to you.
3. In your project dashboard, navigate to Project Settings, then Database.
4. Scroll to "Connection string" and select the "URI" tab:
   - Select "Transaction pooler" (port 6543): copy this URI. This is your `DATABASE_URL`. Always use this pooler string on Vercel because Vercel serverless environments are IPv4 only.
   - Select "Session pooler" or direct connection (port 5432): copy this URI. This is your `DIRECT_URL` (used by Prisma for migrations).
5. In Project Settings, navigate to API and disable the public Data API or ensure Row Level Security (RLS) is enabled so PostgreSQL tables are only accessed through Prisma.
6. Note: Free tier Supabase projects pause after 1 week of inactivity. Always check the Supabase dashboard to verify your database is active before running tests or presenting.

### Step 5: Create an Upstash Redis Database
1. Go to https://console.upstash.com and sign in.
2. Click "Create Database", name it "linkpulse-cache", and choose a region close to your Supabase database.
3. In the database details page, find the "REST API" section.
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Step 6: Create Google OAuth Credentials
1. Go to the Google Cloud Console at https://console.cloud.google.com.
2. Create a project named "LinkPulse".
3. Navigate to APIs and Services, then OAuth consent screen. Set User Type to External and fill required app details.
4. Go to Credentials, click "Create Credentials", and choose "OAuth client ID".
5. Set Application type to "Web application".
6. Under "Authorized redirect URIs", add:
   - Local development: `http://localhost:3000/api/auth/callback/google`
   - Production deployment: `https://your-vercel-deployment.vercel.app/api/auth/callback/google`
7. Copy the Client ID (`AUTH_GOOGLE_ID`) and Client Secret (`AUTH_GOOGLE_SECRET`).

### Step 7: Create Your Local .env File
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and fill in your values:
- `DATABASE_URL`: Your Supabase transaction pooler connection string (port 6543 with pgbouncer=true).
- `DIRECT_URL`: Your Supabase session or direct connection string (port 5432).
- `AUTH_SECRET`: Generate a secure key by running `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` in your terminal.
- `AUTH_URL`: Set to `http://localhost:3000`.
- `AUTH_GOOGLE_ID`: Your Google OAuth client ID.
- `AUTH_GOOGLE_SECRET`: Your Google OAuth client secret.
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL.
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis REST token.
- `NEXT_PUBLIC_APP_URL`: Set to `http://localhost:3000`.

### Step 8: Apply Migrations and Seed Data
Apply database migrations to create tables on Supabase:
```bash
npx prisma migrate dev
```
Generate the Prisma client:
```bash
npx prisma generate
```
Seed the database with sample users, links, and click events (managed by Tejas):
```bash
npm run seed
```

### Step 9: Start the Development Server
Run the local Next.js dev server:
```bash
npm run dev
```
Open your browser and navigate to http://localhost:3000.

### Step 10: Run Tests
Verify that all unit tests pass:
```bash
npm test
```

## 3. Common Problems and Solutions

| Problem | Cause | Solution |
|---|---|---|
| Database connection error | Invalid credentials or network restriction | Check that DATABASE_URL and DIRECT_URL include sslmode=require and valid password in .env |
| Paused Supabase project | Free tier project paused after inactivity | Open Supabase dashboard and unpause the project before running LinkPulse |
| IPv6 or direct connection error | Network or host lacks IPv6 routing | Use the Supabase connection pooler URL (port 6543) which supports IPv4 |
| Missing AUTH_SECRET error | AUTH_SECRET is not set in .env | Generate a 32-character random string and set AUTH_SECRET in .env |
| Google redirect mismatch | Authorized redirect URI does not match current host | Verify that http://localhost:3000/api/auth/callback/google is listed in Google Cloud Console |
| Prisma client not generated | Dependencies installed without running generate | Run `npx prisma generate` in terminal |
| Upstash Redis 401 Unauthorized | Incorrect REST token | Copy the REST token directly from Upstash console REST API tab |
| Port 3000 already in use | Another service is using port 3000 | Kill the process on port 3000 or run `npm run dev -- -p 3001` |

## 4. Deploying to Vercel

1. Push your stable feature branch into `dev`, then open a PR into `main`.
2. Open https://vercel.com and click "Add New Project".
3. Import the GitHub repository `LinkPulse-URL-Shortener-Analytics-Platform-CodeXplorer-`.
4. In Project Settings, navigate to Environment Variables and add all keys from `.env.example`:
   - DATABASE_URL (Supabase transaction pooler on port 6543)
   - DIRECT_URL (Supabase session pooler on port 5432)
   - AUTH_SECRET (production random secret)
   - AUTH_URL (https://your-production-domain.vercel.app)
   - AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
   - UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
   - NEXT_PUBLIC_APP_URL (https://your-production-domain.vercel.app)
5. Set the build command to `next build` and deploy from the `main` branch.
6. Post-deploy check:
   - Visit the production URL and ensure the landing page loads.
   - Test visitor redirection by opening a sample link.
   - Log into the dashboard as Admin and check analytics counts.
