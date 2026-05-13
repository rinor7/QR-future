-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

-- Direct redirect URL: when set on a QR code, scanning jumps straight to this
-- URL instead of rendering the landing page. Empty string = landing page mode.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS direct_redirect_url text NOT NULL DEFAULT '';
