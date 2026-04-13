-- Run this in your Supabase SQL editor to add account contact info to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_phones   text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS account_emails   text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS account_websites text DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS account_street   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_street_nr text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_plz      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_city     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_country  text DEFAULT '';
