-- ============================================================
-- FOLDERS ORG VISIBILITY
-- All users in an org can SEE every folder in that org (read-only).
-- Managing folders (create/edit/delete) still requires an explicit role.
-- QR-card visibility inside a folder is unchanged (writers/readers
-- still only see cards they personally created).
-- ============================================================

DROP POLICY IF EXISTS "folders_select" ON folders;
CREATE POLICY "folders_select" ON folders
  FOR SELECT USING (
    organization_id IN (
      SELECT owner_id FROM profiles WHERE user_id = auth.uid()
    )
    OR user_can_access_folder(auth.uid(), id)
  );
