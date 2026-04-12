-- Run in Supabase SQL Editor

-- 1. Add organization name to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name text;

-- 2. Expand qr_templates with company branding + QR style fields
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS snapchat_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS x_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS other_social_url text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_dot_style text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_corner_style text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_dot_color text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_bg_color text;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_gradient boolean DEFAULT false;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS qr_gradient_color text;
