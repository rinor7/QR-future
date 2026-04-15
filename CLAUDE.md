# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # local dev server (Next.js)
npm run build     # production build (use this to surface type errors)
npm run lint      # next lint
npx tsc --noEmit  # type-check only (faster than a full build)
```

No test suite exists. Don't propose adding one unless asked.

## Deployment Workflow

- **Work branch**: `production` (not `master`). All commits and pushes go to `origin/production`.
- **Vercel**: auto-deploys `production` → live site. `master` is stale and unused.
- After pushing, the user verifies on the real prod URL (not a dev server). Browser cache can mask changes — if the user says "no change", suspect the deployment pipeline before suspecting the browser.
- Never force-push, never touch `master`.

## Architecture

### Stack
- Next.js 14 App Router, React 18, TypeScript, Tailwind
- Supabase (Postgres + Auth + Storage) — client is created in [src/lib/supabase-browser.ts](src/lib/supabase-browser.ts) for browser components and [src/lib/supabase.ts](src/lib/supabase.ts) for server
- `qr-code-styling` for styled QR rendering, `stripe` for billing
- No ORM — raw `supabase.from("table")` calls

### Two halves of the app
1. **`src/app/dashboard/*`** — authenticated admin area. Create/edit/list QR codes, analytics, team, settings, folders, leads, plans.
2. **`src/app/qr/[id]`** — public landing page shown when a QR is scanned. No auth. Rendering lives in [src/app/qr/[id]/QRLandingClient.tsx](src/app/qr/[id]/QRLandingClient.tsx). All interaction tracking (phone taps, website clicks, lead submissions) POSTs to `/api/interaction` or `/api/lead`. `/qr/:id*` is explicitly `no-store` in [next.config.mjs](next.config.mjs).

### Central data layer: [src/lib/store.ts](src/lib/store.ts)
All contact CRUD flows through this file. Two critical functions to understand before editing any QR-related code:

- **`toContact(row)`** — snake_case DB row → camelCase `QRContact`. Handles the legacy-vs-array shape for `phone`/`email`/`website` columns (see below).
- **`toRow(data)`** — camelCase → snake_case for inserts/updates. Only includes fields that are `!== undefined`, so partial updates are safe.

### The phones/emails/websites shape (important, easy to break)

The DB columns `phone`, `email`, `website` are **text columns that store JSON strings**. They started as single values, then became arrays of `{ number|email|url, label }` objects. `toContact` parses both shapes; `toRow` always writes JSON arrays.

**Invariants**:
- Empty arrays are stored as `""` (empty string), **not** `null` (columns are NOT NULL) and **not** `"[]"` (renders as literal `[]` on the live card).
- `toContact` returns **both** the singular (`phone`) and plural (`phones`) fields on every contact — legacy code paths read the singular, new code reads the plural. Keep both working.
- The QR landing client at [src/app/qr/[id]/QRLandingClient.tsx](src/app/qr/[id]/QRLandingClient.tsx) prefers `contact.websites` but falls back to `contact.website` — filter empty entries before mapping.

If you see "Webseite []" or similar on a live card, the empty-array → `"[]"` bug has regressed. Check `toRow`.

### QR form ([src/components/QRForm.tsx](src/components/QRForm.tsx))
The single form component used by both `/dashboard/create` and `/dashboard/edit/[id]`. It owns a local `form` state mirroring `CreateQRContact` and calls `onFormChange` so preview panels in the parent pages re-render live.

- Internal `Section` helper wraps every block. Pass `collapsible defaultOpen={false}` for sections we want collapsed by default (QR Code Design, Social, Notes).
- Template application: `applyTemplate` parses JSON arrays from a saved template and spreads `phones/emails/websites` onto the form when present.
- Input layout gotcha: the shared `inputCls` includes `w-full`, which collapses inside flex rows with a sibling label input. Wrap each input in a sized `<div>` (`flex-1 min-w-0` for the main, `w-28 shrink-0` for the label) rather than putting widths directly on the `<input>`.

### Roles, orgs, multi-tenant model
- Every user has a `profiles` row with `owner_id`. Team members share their admin's `owner_id`.
- `QRContact.user_id` stores the **owner's** user_id, so writers/readers create QR codes under the admin's org.
- `getUserProfile()` in [store.ts](src/lib/store.ts) is the authoritative source for `ownerId`, `role`, and `plan`. Plan enforcement for non-admins reads the owner's plan, not the actor's.
- Roles: `admin` (org owner), `writer` (can create), `reader` (view own only), `owner` (platform admin).

### Activity feed
[src/components/ActivityPanel.tsx](src/components/ActivityPanel.tsx) polls `/api/activity` every 30s. The API route merges `qr_scans`, `qr_interactions`, `qr_leads` into a unified `ActivityItem[]`. Unread state is tracked via `localStorage("qr-activity-seen")`. Rows link to `/dashboard/analytics/:qr_id` (not `/edit/:id`).

### i18n
[src/lib/language.tsx](src/lib/language.tsx) holds German and English string tables. Components read strings via a `tr` object — no external i18n library.

### Database migrations
SQL files live at repo root: [supabase-schema.sql](supabase-schema.sql), [supabase-folders-migration.sql](supabase-folders-migration.sql), [supabase-plans-migration.sql](supabase-plans-migration.sql). Run them by hand in the Supabase SQL Editor — there is no migration runner.

## Working Style Notes

- The user is non-technical and tests on the real prod URL after each push. Ship small, verify visually, iterate.
- Don't add comments, tests, abstractions, or refactors that weren't requested.
- Don't add backwards-compat shims or "removed" markers — just delete.
- When the user reports a bug, check whether a recent commit of yours introduced it before exploring broadly.
