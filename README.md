# QR Code Management Platform

A web app to create and manage QR codes with unique public landing pages (digital business cards).

## What it does

- **Admin dashboard** — create, edit, and delete QR codes
- **QR generation** — each entry gets a unique scannable QR code
- **Public landing pages** — anyone who scans the QR code sees the contact page instantly (no login needed)
- **Protected dashboard** — only you can access the admin area (email + password login)

## Tech Stack

- [Next.js 14](https://nextjs.org/) — React framework
- [Supabase](https://supabase.com/) — database and authentication
- [Vercel](https://vercel.com/) — hosting and deployment
- [Tailwind CSS](https://tailwindcss.com/) — styling

## External Services & Accounts

The production app depends on the following third-party accounts. Keep all of them under the same owner email so renewals/billing don't get split.

| Service | Purpose | Plan | Console |
|---|---|---|---|
| **Supabase** | Postgres database, Auth, Storage (logos, PDFs, lead exports) | Pro (paid) | https://supabase.com/dashboard |
| **Vercel** | Hosting, deployment, cron, custom-domain routing | Pro (paid) | https://vercel.com/dashboard |
| **Stripe** | Subscription billing for paid tiers (Star, Premium, Platinum) | Standard | https://dashboard.stripe.com |
| **Google Cloud (Places API)** | Address autocomplete in the QR creation form | Pay-as-you-go ($200/mo free credit covers normal traffic) | https://console.cloud.google.com |
| **Upstash Redis** | Rate-limit counters for public POST endpoints | Free (256 MB / 10k commands per day) | https://console.upstash.com |
| **Microsoft 365 (SMTP)** | Outbound transactional email from `noreply@qr-card.ch` (support replies, customer reminders) | Existing M365 mailbox | https://admin.microsoft.com |
| **GitHub** | Source code, push triggers Vercel auto-deploys | Free | https://github.com/rinor7/QR-future |
| **ip-api.com** | Geo-IP lookup on scans/leads (no account required, no key) | Free tier | https://ip-api.com |

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview + Development) and mirror them in `.env.local` for local development.

```
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- App ---
NEXT_PUBLIC_APP_URL=https://qr-card.ch

# --- Stripe ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# --- Google Places ---
GOOGLE_PLACES_API_KEY=

# --- Upstash Redis (rate limiting) ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Microsoft 365 SMTP ---
M365_SMTP_HOST=
M365_SMTP_PORT=587
M365_NOREPLY_USER=
M365_NOREPLY_PASS=

# --- Vercel API (custom-domain mgmt) ---
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=

# --- Cron (scheduled cleanup) ---
CRON_SECRET=
```

## Project Structure

```
/app
  /dashboard        → Admin area (protected, requires login)
  /qr/[id]          → Public QR landing page
  /login            → Login page
  /api              → Server routes (39 endpoints)
/components         → Shared UI components
/lib                → Data layer, auth, brand, rate-limit helper
*.sql               → Database migrations (run by hand in Supabase SQL Editor)
```

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL Editor
3. Run each `*-migration.sql` file in chronological order (folder root)
4. Go to **Settings → Data API** and copy your Project URL, anon key, and service-role key

### 2. Other services
Sign up for each service in the table above and copy its credentials into Vercel env vars.

### 3. Run locally
```bash
npm install
npm run dev
```

### 4. Deploy
Push to GitHub `production` branch — Vercel auto-deploys. Live site: https://qr-card.ch
