-- Allow auth.users delete to cascade through folders.created_by.
-- Without this, deleting an auth user is blocked if they ever created a folder.
ALTER TABLE folders
  DROP CONSTRAINT IF EXISTS folders_created_by_fkey;

ALTER TABLE folders
  ADD CONSTRAINT folders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Same for contacts.user_id (owner reference).
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
