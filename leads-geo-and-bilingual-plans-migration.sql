-- Run this in the Supabase SQL Editor.

-- 1. Bilingual plan features
--    Existing `features` column is treated as German.
--    Add a parallel English column.
alter table plan_config add column if not exists features_en jsonb;

-- 2. Capture richer lead context (location + device)
alter table qr_leads add column if not exists country     text;
alter table qr_leads add column if not exists city        text;
alter table qr_leads add column if not exists device_type text;
alter table qr_leads add column if not exists os          text;
