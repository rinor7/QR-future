-- Fix foreign keys that point at auth.users but don't cascade on delete.
-- Without these, Supabase auth.admin.deleteUser fails with
-- "Database error deleting user" whenever a user has related rows.

-- folders.created_by
ALTER TABLE folders
  DROP CONSTRAINT IF EXISTS folders_created_by_fkey;
ALTER TABLE folders
  ADD CONSTRAINT folders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- contacts.user_id (tenant owner — owner delete wipes all contacts in org)
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- profiles.owner_id (sub-user profiles inherit the owner — owner delete
-- wipes the whole org's sub-users via cascade)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_owner_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
