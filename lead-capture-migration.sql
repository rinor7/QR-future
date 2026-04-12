-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

-- 1. Per-QR lead capture toggle
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_capture_enabled boolean DEFAULT false;

-- 2. Global org-level lead capture disable flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_capture_disabled boolean DEFAULT false;

-- 3. Leads table
CREATE TABLE IF NOT EXISTS qr_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id text NOT NULL,
  visitor_id text,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  consent boolean NOT NULL DEFAULT true,
  consented_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_leads_contact_id_idx ON qr_leads(contact_id);

-- 4. RLS: service role only (leads are private, only readable by the org)
ALTER TABLE qr_leads ENABLE ROW LEVEL SECURITY;
