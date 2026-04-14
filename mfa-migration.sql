-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Adds the mfa_members_allowed column to profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mfa_members_allowed boolean NOT NULL DEFAULT true;
