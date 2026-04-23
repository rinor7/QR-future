# QR Platform — Documentation

## Overview

A SaaS platform for creating and managing digital business cards via QR codes. Users create a QR code that links to a live contact page — the page can be updated anytime without reprinting the QR code.

Live domain: **qr-card.ch**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + Google OAuth) |
| Payments | Stripe (subscriptions) |
| Hosting | Vercel |
| Storage | Supabase Storage (logos, backgrounds, files) |

---

## Environment Variables

Set these in Vercel → Project → Settings → Environment Variables.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. https://qr-card.ch) |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (server-side only) |

---

## Database Tables

### `contacts`
Stores each QR card / digital business card.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner (references profiles) |
| `qr_label` | text | Internal label shown in dashboard |
| `first_name` | text | |
| `last_name` | text | |
| `title` | text | Job title / position |
| `company` | text | |
| `description` | text | Short text under company name |
| `logo_url` | text | Logo image URL |
| `phone` | text | |
| `email` | text | |
| `website` | text | |
| `linkedin_url` | text | |
| `instagram_url` | text | |
| `facebook_url` | text | |
| `tiktok_url` | text | |
| `snapchat_url` | text | |
| `x_url` | text | X / Twitter |
| `other_social_url` | text | |
| `links` | jsonb | Up to 4 file/link attachments |
| `country` | text | Country code (ch, de, at, li, fr, lu) |
| `street` | text | |
| `street_nr` | text | |
| `plz` | text | Postal code |
| `city` | text | |
| `primary_color` | text | Hex color for card accent |
| `bg_image_url` | text | Card header background image |
| `notes` | text | Internal notes |
| `show_logo_in_qr` | boolean | Whether to embed logo in QR code |
| `is_active` | boolean | Active/paused (plan limit enforcement) |
| `theme` | text | Card theme: classic / dark / minimal |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Required DB migrations:**
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country text;
```

---

### `profiles`
One row per registered user.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid | References auth.users |
| `email` | text | |
| `plan` | text | free / star / premium / platinum |
| `role` | text | owner / admin / writer / reader |
| `owner_id` | uuid | For team members: points to the org owner |
| `is_platform_admin` | boolean | True for the platform superadmin |
| `stripe_customer_id` | text | Stripe customer ID |
| `support_email` | text | Platform admin support email shown on errors |
| `created_at` | timestamptz | |

**Required DB migration:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS support_email text;
```

---

### `scans`
One row per QR code scan.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `contact_id` | uuid | References contacts |
| `scanned_at` | timestamptz | |
| `user_agent` | text | Browser/device info |

---

### `plan_config`
Editable plan configuration (prices and features).

| Column | Type | Description |
|---|---|---|
| `plan` | text | free / star / premium / platinum |
| `price` | numeric | Monthly price in CHF |
| `features` | jsonb | Array of feature strings shown on landing page |

---

## Plans & Limits

| Plan | QR Codes | Price |
|---|---|---|
| Free | 1 | CHF 0 |
| Star | 10 | configurable |
| Premium | 100 | configurable |
| Platinum | Unlimited | configurable |

- Plans are enforced on QR code creation
- Stripe handles billing for paid plans
- Platform admin can manually upgrade free accounts from the Clients page
- Paid plans (Stripe or manually set) are locked from admin changes

---

## User Roles

| Role | Description |
|---|---|
| `owner` | Org owner — full access, can manage team, create/edit QR codes |
| `admin` | Team member with full edit access |
| `writer` | Team member, can edit QR codes but not manage users |
| `reader` | View-only access |
| Platform Admin | Superuser — manages all clients, plan config, support email |

**Important:** Platform admin is a separate concept from org owner. Platform admin manages the SaaS itself; org owners are the clients using the platform.

---

## Pages

### Public
| Route | Description |
|---|---|
| `/` | Landing page with hero, features, how it works, pricing, FAQ |
| `/login` | Login with email or Google OAuth |
| `/register` | Registration with email or Google OAuth |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password (from email link) |
| `/qr/[id]` | Public QR card page (scanned by visitors) |

### Dashboard (requires login)
| Route | Description |
|---|---|
| `/dashboard` | Overview / home |
| `/dashboard/codes` | List of all QR codes with scan counts + CSV export |
| `/dashboard/create` | Create a new QR code |
| `/dashboard/edit/[id]` | Edit an existing QR code |
| `/dashboard/users` | Team management (org owners/admins only) |
| `/dashboard/upgrade` | Plan upgrade page |
| `/dashboard/settings` | Account settings, support email (platform admin) |

### Platform Admin only
| Route | Description |
|---|---|
| `/dashboard/clients` | View and manage all client accounts |
| `/dashboard/clients/[userId]` | View a specific client's details |
| `/dashboard/plan-settings` | Edit plan prices and features |

---

## API Routes

### Scans
| Route | Method | Description |
|---|---|---|
| `/api/scan` | POST | Record a QR code scan |
| `/api/scan/counts` | GET | Scan counts per contact |
| `/api/scan/stats` | GET | Scan stats for dashboard |
| `/api/scan/export` | GET | Export scan data as CSV |

### Admin
| Route | Method | Description |
|---|---|---|
| `/api/admin/clients` | GET | List all client accounts |
| `/api/admin/clients/[userId]` | GET | Get single client details |
| `/api/admin/clients/update-plan` | POST | Change a client's plan |
| `/api/admin/clients/delete` | POST | Delete a client account |
| `/api/admin/plan-config` | GET/POST | Read/update plan prices and features |

### Users (team)
| Route | Method | Description |
|---|---|---|
| `/api/users/invite` | POST | Invite a team member by email |
| `/api/users/remove` | POST | Remove a team member |
| `/api/users/resend-invite` | POST | Resend invite email |

### Stripe
| Route | Method | Description |
|---|---|---|
| `/api/stripe/checkout` | POST | Create a Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe events (subscription changes) |

### Places (Google)
| Route | Method | Description |
|---|---|---|
| `/api/places/autocomplete` | GET | Address suggestions by country |
| `/api/places/details` | GET | Parse address components from place ID |

### Platform
| Route | Method | Description |
|---|---|---|
| `/api/platform/support-email` | GET | Get platform admin support email |

### Cron
| Route | Method | Description |
|---|---|---|
| `/api/cron/cleanup-free-tier` | GET | Pause excess QR codes for free users |

---

## Key Components

| Component | Description |
|---|---|
| `QRForm` | Main form for creating/editing a QR card |
| `QRCodeDisplay` | Renders the QR code SVG with optional logo |
| `AddressAutocomplete` | Street input with Google Places suggestions |
| `Sidebar` | Dashboard navigation (role-aware) |
| `FAQSection` | Collapsible FAQ on landing page |
| `QRDemoSection` | Live QR preview on landing page |

---

## QR Form Fields

**Identity:** First name, Last name, Title/Position, Company, Description

**Contact:** Phone, Email, Website

**Social:** LinkedIn, Instagram, Facebook, TikTok, Snapchat, X, Other

**Address:** Country (required to unlock fields), Street (autocomplete), No., PLZ, City

**Files/Links:** Up to 4 PDF or URL attachments

**Display:** Card theme (Classic/Dark/Minimal), Primary color, Background image, Logo, Show logo in QR toggle

---

## Auth Flow

- Email/password registration → confirmation email → login
- Google OAuth → redirects through `/auth/callback` → dashboard
- Password reset → email with link → `/auth/confirm` → `/reset-password`
- Team invite → email with link → `/auth/callback` → `/auth/set-password`

---

## Stripe Integration

1. User clicks upgrade → `/api/stripe/checkout` creates a session
2. User pays on Stripe hosted page
3. Stripe sends webhook to `/api/stripe/webhook`
4. Webhook updates `profiles.plan` and enforces QR code limits
5. If downgraded, excess QR codes are paused (oldest kept active)

---

## Google Places Integration

- API key stored server-side as `GOOGLE_PLACES_API_KEY` (never exposed to browser)
- User selects country first (CH/DE/AT/LI/FR/LU)
- Typing in street field calls `/api/places/autocomplete` with country filter
- Selecting a suggestion calls `/api/places/details` to parse street, number, PLZ, city
- All 4 address fields auto-fill on selection

---

## Support Email

- Set by platform admin in Settings
- Stored in `profiles.support_email` for the platform admin user
- Fetched via `/api/platform/support-email` (public, no auth required)
- Shown as a mailto link when a QR card save error occurs

