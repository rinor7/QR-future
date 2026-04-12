-- NFC card management
CREATE TABLE IF NOT EXISTS nfc_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_uid text NOT NULL,           -- the unique code from the physical card
  user_id text NOT NULL,            -- org owner
  contact_id text,                  -- current mapping (nullable = unassigned)
  label text,                       -- optional human name e.g. "John's card"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, card_uid)         -- same UID can't be registered twice per org
);

CREATE INDEX IF NOT EXISTS nfc_cards_user_id_idx ON nfc_cards(user_id);
CREATE INDEX IF NOT EXISTS nfc_cards_card_uid_idx ON nfc_cards(card_uid);

ALTER TABLE nfc_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own NFC cards"
  ON nfc_cards FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
