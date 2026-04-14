-- Add phones, emails, websites JSON columns to qr_templates
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS phones text DEFAULT NULL;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS emails text DEFAULT NULL;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS websites text DEFAULT NULL;
