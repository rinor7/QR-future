-- Add phones, emails, websites JSON columns to qr_templates
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS phones text DEFAULT NULL;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS emails text DEFAULT NULL;
ALTER TABLE qr_templates ADD COLUMN IF NOT EXISTS websites text DEFAULT NULL;

-- Migrate profiles from array columns to single-value columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_phone text DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_email text DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_website text DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_socials text DEFAULT NULL;

-- Copy first value from old array columns to new single columns (if old columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_phones') THEN
    UPDATE profiles
    SET account_phone = (SELECT (elem->>'number') FROM jsonb_array_elements(account_phones::jsonb) AS elem LIMIT 1)
    WHERE account_phones IS NOT NULL AND account_phones != '[]' AND account_phone IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_emails') THEN
    UPDATE profiles
    SET account_email = (SELECT (elem->>'email') FROM jsonb_array_elements(account_emails::jsonb) AS elem LIMIT 1)
    WHERE account_emails IS NOT NULL AND account_emails != '[]' AND account_email IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_websites') THEN
    UPDATE profiles
    SET account_website = (SELECT (elem->>'url') FROM jsonb_array_elements(account_websites::jsonb) AS elem LIMIT 1)
    WHERE account_websites IS NOT NULL AND account_websites != '[]' AND account_website IS NULL;
  END IF;
END $$;
