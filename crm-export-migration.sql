-- Add webhook URL to profiles for Zapier/API integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_webhook_url text;
