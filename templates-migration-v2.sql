-- Run in Supabase SQL Editor

-- Add locked_fields array to qr_templates
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS locked_fields text[] DEFAULT '{}';
