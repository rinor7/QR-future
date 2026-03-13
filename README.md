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

## Project Structure

```
/app
  /dashboard        → Admin area (protected, requires login)
  /qr/[id]          → Public QR landing page
  /login            → Login page
/components         → Shared UI components
supabase-schema.sql → Database schema (run this in Supabase SQL Editor)
```

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL Editor
3. Go to **Settings → Data API** and copy your Project URL and anon key
4. Create your admin user under **Authentication → Users**

### 2. Environment Variables
Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run locally
```bash
npm install
npm run dev
```

### 4. Deploy
Push to GitHub — Vercel auto-deploys. Add the env variables in Vercel project settings.
