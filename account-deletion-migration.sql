-- ============================================================
-- ACCOUNT DELETION MIGRATION
-- Run in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================
-- Purpose:
--   1. Flag QR cards whose original creator self-deleted, so the
--      dashboard can surface "(departed)" next to their name.
--   2. Add a lightweight org_notifications table to power the
--      activity-feed notice that a sub-user left.
-- ============================================================

-- 1. Flag on contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS original_creator_deleted boolean NOT NULL DEFAULT false;

-- 2. Org-level notifications (user left, future plan events, etc.)
CREATE TABLE IF NOT EXISTS org_notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid        NOT NULL,
  type       text        NOT NULL,        -- 'user_deleted' for now
  message    text        NOT NULL,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_notifications_owner_created_idx
  ON org_notifications (owner_id, created_at DESC);

-- Service role only (read via API, no direct client access needed)
ALTER TABLE org_notifications ENABLE ROW LEVEL SECURITY;
