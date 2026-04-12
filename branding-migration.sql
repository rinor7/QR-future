-- White label branding per org
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_primary_color text;

-- Custom domain
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_domain_verified boolean DEFAULT false;

-- Company templates
CREATE TABLE IF NOT EXISTS qr_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  primary_color text DEFAULT '#2563eb',
  theme text DEFAULT 'classic',
  bg_image_url text,
  show_logo_in_qr boolean DEFAULT true,
  lead_capture_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_templates_user_id_idx ON qr_templates(user_id);
ALTER TABLE qr_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own templates"
  ON qr_templates FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
