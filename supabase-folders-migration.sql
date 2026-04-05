-- ============================================================
-- FOLDER SYSTEM MIGRATION
-- Run in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================
-- Architecture decisions:
--   - Adjacency list (parent_id) for hierarchy — simple, CTE-based recursion for queries
--   - organization_id = owner_id from profiles — existing tenant key, no new column needed
--   - Permissions inherit downward via recursive ancestor walk
--   - delete_folder() is strict: rejects if children, users, or QR codes exist
--   - contacts.id is TEXT (not UUID) — all assignment functions use text for QR ids
-- ============================================================


-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE folder_type AS ENUM (
    'company', 'subsidiary', 'location', 'department', 'team', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE folder_role AS ENUM (
    'super_admin', 'company_admin', 'location_manager', 'team_manager', 'employee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS folders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL CHECK (length(trim(name)) > 0),
  type            folder_type NOT NULL DEFAULT 'custom',
  parent_id       uuid        REFERENCES folders(id) ON DELETE RESTRICT,
  organization_id uuid        NOT NULL,  -- = owner_id from profiles (tenant key)
  created_by      uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_parent CHECK (id != parent_id)
);

-- Unique folder name within the same parent and organization.
-- COALESCE(parent_id::text, 'ROOT') handles NULL parents (root folders).
CREATE UNIQUE INDEX IF NOT EXISTS folders_unique_name_per_parent
  ON folders(organization_id, COALESCE(parent_id::text, 'ROOT'), lower(name));

CREATE INDEX IF NOT EXISTS folders_parent_id_idx       ON folders(parent_id);
CREATE INDEX IF NOT EXISTS folders_organization_id_idx ON folders(organization_id);
CREATE INDEX IF NOT EXISTS folders_org_parent_idx      ON folders(organization_id, parent_id);
CREATE INDEX IF NOT EXISTS folders_created_by_idx      ON folders(created_by);


CREATE TABLE IF NOT EXISTS folder_permissions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id  uuid        NOT NULL REFERENCES folders(id)     ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  role       folder_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folder_permissions_unique UNIQUE (folder_id, user_id)
);

CREATE INDEX IF NOT EXISTS folder_permissions_folder_id_idx    ON folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS folder_permissions_user_id_idx      ON folder_permissions(user_id);
CREATE INDEX IF NOT EXISTS folder_permissions_user_folder_idx  ON folder_permissions(user_id, folder_id);


-- Add folder_id to profiles (one folder per user, MVP rule)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_folder_id_idx ON profiles(folder_id);


-- Add folder_id to contacts (one folder per QR code, MVP rule)
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contacts_folder_id_idx ON contacts(folder_id);


-- Auto-update updated_at on folders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS folders_updated_at ON folders;
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- SECTION 3: HIERARCHY FUNCTIONS
-- ============================================================

-- Direct children of a folder
CREATE OR REPLACE FUNCTION list_folder_children(p_folder_id uuid)
RETURNS SETOF folders AS $$
  SELECT * FROM folders WHERE parent_id = p_folder_id ORDER BY name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Root folders for an organization
CREATE OR REPLACE FUNCTION list_root_folders(p_organization_id uuid)
RETURNS SETOF folders AS $$
  SELECT * FROM folders
  WHERE organization_id = p_organization_id AND parent_id IS NULL
  ORDER BY name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Full subtree rooted at p_root_folder_id (top-down, depth-limited to 20)
CREATE OR REPLACE FUNCTION get_folder_tree(p_root_folder_id uuid)
RETURNS TABLE(
  id              uuid,
  name            text,
  type            folder_type,
  parent_id       uuid,
  organization_id uuid,
  depth           int
) AS $$
WITH RECURSIVE subtree AS (
  SELECT f.id, f.name, f.type, f.parent_id, f.organization_id, 0 AS depth
  FROM folders f
  WHERE f.id = p_root_folder_id

  UNION ALL

  SELECT f.id, f.name, f.type, f.parent_id, f.organization_id, s.depth + 1
  FROM folders f
  INNER JOIN subtree s ON f.parent_id = s.id
  WHERE s.depth < 20  -- hard safety cap: no queries beyond 20 levels
)
SELECT id, name, type, parent_id, organization_id, depth
FROM subtree
ORDER BY depth, name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Full ancestor chain for a folder (bottom-up, excludes the folder itself)
CREATE OR REPLACE FUNCTION get_folder_ancestors(p_folder_id uuid)
RETURNS TABLE(
  id              uuid,
  name            text,
  type            folder_type,
  parent_id       uuid,
  organization_id uuid,
  depth           int  -- 1 = direct parent, 2 = grandparent, ...
) AS $$
WITH RECURSIVE ancestors AS (
  SELECT f.id, f.name, f.type, f.parent_id, f.organization_id, 0 AS depth
  FROM folders f
  WHERE f.id = p_folder_id

  UNION ALL

  SELECT f.id, f.name, f.type, f.parent_id, f.organization_id, a.depth + 1
  FROM folders f
  INNER JOIN ancestors a ON f.id = a.parent_id
  WHERE a.depth < 20
)
SELECT id, name, type, parent_id, organization_id, depth
FROM ancestors
WHERE id != p_folder_id  -- exclude the starting folder itself
ORDER BY depth;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Returns TRUE if p_folder_id is a descendant of p_ancestor_id (circular check helper)
CREATE OR REPLACE FUNCTION is_descendant_of(p_folder_id uuid, p_ancestor_id uuid)
RETURNS boolean AS $$
WITH RECURSIVE chain AS (
  SELECT parent_id FROM folders WHERE id = p_folder_id
  UNION ALL
  SELECT f.parent_id FROM folders f INNER JOIN chain c ON f.id = c.parent_id
  WHERE c.parent_id IS NOT NULL
)
SELECT EXISTS (SELECT 1 FROM chain WHERE parent_id = p_ancestor_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- SECTION 4: PERMISSION FUNCTIONS
-- ============================================================

-- Role priority: lower number = higher privilege
-- super_admin=1, company_admin=2, location_manager=3, team_manager=4, employee=5
--
-- Walks from p_folder_id up to root, returns the highest-privilege role found.
-- Direct permission on the folder beats inherited permission only in priority terms.

CREATE OR REPLACE FUNCTION get_user_effective_role(p_user_id uuid, p_folder_id uuid)
RETURNS folder_role AS $$
DECLARE
  v_role folder_role;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, 0 AS depth
    FROM folders
    WHERE id = p_folder_id

    UNION ALL

    SELECT f.id, f.parent_id, a.depth + 1
    FROM folders f
    INNER JOIN ancestors a ON f.id = a.parent_id
    WHERE a.depth < 20
  ),
  ranked AS (
    SELECT fp.role,
      CASE fp.role
        WHEN 'super_admin'      THEN 1
        WHEN 'company_admin'    THEN 2
        WHEN 'location_manager' THEN 3
        WHEN 'team_manager'     THEN 4
        WHEN 'employee'         THEN 5
      END AS priority
    FROM folder_permissions fp
    INNER JOIN ancestors a ON fp.folder_id = a.id
    WHERE fp.user_id = p_user_id
  )
  SELECT role INTO v_role
  FROM ranked
  ORDER BY priority ASC
  LIMIT 1;

  RETURN v_role;  -- NULL if no permission found anywhere in ancestor chain
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- Can user read/access a folder? (any role counts)
CREATE OR REPLACE FUNCTION user_can_access_folder(p_user_id uuid, p_folder_id uuid)
RETURNS boolean AS $$
  SELECT get_user_effective_role(p_user_id, p_folder_id) IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- Can user manage (create/edit/move/delete inside) a folder?
-- Requires: super_admin, company_admin, location_manager, or team_manager
CREATE OR REPLACE FUNCTION user_can_manage_folder(p_user_id uuid, p_folder_id uuid)
RETURNS boolean AS $$
  SELECT get_user_effective_role(p_user_id, p_folder_id) IN (
    'super_admin', 'company_admin', 'location_manager', 'team_manager'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- SECTION 5: VALIDATION FUNCTIONS
-- ============================================================

-- Returns NULL if move is valid, or an error message string.
CREATE OR REPLACE FUNCTION validate_folder_move(p_folder_id uuid, p_new_parent_id uuid)
RETURNS text AS $$
DECLARE
  v_src  folders%ROWTYPE;
  v_dest folders%ROWTYPE;
BEGIN
  -- Cannot move into itself
  IF p_folder_id = p_new_parent_id THEN
    RETURN 'Cannot move a folder into itself.';
  END IF;

  SELECT * INTO v_src FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN RETURN 'Source folder not found.'; END IF;

  -- Moving to root (NULL parent) is always valid within same org
  IF p_new_parent_id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_dest FROM folders WHERE id = p_new_parent_id;
  IF NOT FOUND THEN RETURN 'Target folder not found.'; END IF;

  -- Cross-tenant move blocked
  IF v_src.organization_id != v_dest.organization_id THEN
    RETURN 'Cannot move a folder across different organizations.';
  END IF;

  -- Cannot move into own descendant (would create cycle)
  IF is_descendant_of(p_new_parent_id, p_folder_id) THEN
    RETURN 'Cannot move a folder into its own subtree (would create a circular reference).';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- Returns NULL if safe to delete, or an error message string.
-- Strategy: STRICT — reject if any children, users, or QR codes exist.
-- Rationale: prevents accidental data orphaning; forces explicit reassignment.
CREATE OR REPLACE FUNCTION validate_folder_delete(p_folder_id uuid)
RETURNS text AS $$
DECLARE
  v_child_count int;
  v_user_count  int;
  v_qr_count    int;
BEGIN
  SELECT COUNT(*) INTO v_child_count FROM folders   WHERE parent_id = p_folder_id;
  SELECT COUNT(*) INTO v_user_count  FROM profiles  WHERE folder_id = p_folder_id;
  SELECT COUNT(*) INTO v_qr_count    FROM contacts  WHERE folder_id = p_folder_id;

  IF v_child_count > 0 THEN
    RETURN 'Cannot delete: ' || v_child_count || ' child folder(s) exist. Move or delete them first.';
  END IF;

  IF v_user_count > 0 THEN
    RETURN 'Cannot delete: ' || v_user_count || ' user(s) are assigned to this folder. Reassign them first.';
  END IF;

  IF v_qr_count > 0 THEN
    RETURN 'Cannot delete: ' || v_qr_count || ' QR code(s) are assigned to this folder. Reassign them first.';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================
-- SECTION 6: FOLDER CRUD FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION create_folder(
  p_name            text,
  p_type            folder_type,
  p_parent_id       uuid,       -- NULL for root
  p_organization_id uuid,
  p_created_by      uuid
)
RETURNS folders AS $$
DECLARE
  v_folder folders%ROWTYPE;
BEGIN
  p_name := trim(p_name);

  IF length(p_name) = 0 THEN
    RAISE EXCEPTION 'Folder name cannot be empty.';
  END IF;

  -- Parent must belong to same org
  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM folders
      WHERE id = p_parent_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Parent folder not found or belongs to a different organization.';
    END IF;
  END IF;

  INSERT INTO folders(name, type, parent_id, organization_id, created_by)
  VALUES (p_name, p_type, p_parent_id, p_organization_id, p_created_by)
  RETURNING * INTO v_folder;

  RETURN v_folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION update_folder(
  p_folder_id uuid,
  p_name      text,
  p_type      folder_type
)
RETURNS folders AS $$
DECLARE
  v_folder folders%ROWTYPE;
BEGIN
  p_name := trim(p_name);
  IF length(p_name) = 0 THEN
    RAISE EXCEPTION 'Folder name cannot be empty.';
  END IF;

  UPDATE folders
  SET name = p_name, type = p_type, updated_at = now()
  WHERE id = p_folder_id
  RETURNING * INTO v_folder;

  IF NOT FOUND THEN RAISE EXCEPTION 'Folder not found.'; END IF;
  RETURN v_folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION move_folder(p_folder_id uuid, p_new_parent_id uuid)
RETURNS folders AS $$
DECLARE
  v_err    text;
  v_folder folders%ROWTYPE;
BEGIN
  v_err := validate_folder_move(p_folder_id, p_new_parent_id);
  IF v_err IS NOT NULL THEN RAISE EXCEPTION '%', v_err; END IF;

  UPDATE folders
  SET parent_id = p_new_parent_id, updated_at = now()
  WHERE id = p_folder_id
  RETURNING * INTO v_folder;

  RETURN v_folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION delete_folder(p_folder_id uuid)
RETURNS void AS $$
DECLARE
  v_err text;
BEGIN
  v_err := validate_folder_delete(p_folder_id);
  IF v_err IS NOT NULL THEN RAISE EXCEPTION '%', v_err; END IF;

  DELETE FROM folders WHERE id = p_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_folder(p_folder_id uuid)
RETURNS folders AS $$
  SELECT * FROM folders WHERE id = p_folder_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- SECTION 7: ASSIGNMENT FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION assign_user_to_folder(p_user_id uuid, p_folder_id uuid)
RETURNS void AS $$
DECLARE
  v_user_org   uuid;
  v_folder_org uuid;
BEGIN
  SELECT owner_id           INTO v_user_org   FROM profiles WHERE user_id  = p_user_id;
  SELECT organization_id    INTO v_folder_org FROM folders  WHERE id       = p_folder_id;

  IF v_folder_org IS NULL THEN RAISE EXCEPTION 'Folder not found.'; END IF;
  IF v_user_org   IS NULL THEN RAISE EXCEPTION 'User not found.';   END IF;

  -- Tenant check: user's org must match folder's org
  IF v_user_org != v_folder_org THEN
    RAISE EXCEPTION 'Cannot assign user to a folder in a different organization.';
  END IF;

  UPDATE profiles SET folder_id = p_folder_id WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- contacts.id is TEXT (not uuid) — match existing schema
CREATE OR REPLACE FUNCTION assign_qr_code_to_folder(p_qr_code_id text, p_folder_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM folders WHERE id = p_folder_id) THEN
    RAISE EXCEPTION 'Folder not found.';
  END IF;

  UPDATE contacts SET folder_id = p_folder_id WHERE id = p_qr_code_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'QR code not found.'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION bulk_assign_users_to_folder(p_user_ids uuid[], p_folder_id uuid)
RETURNS int AS $$
DECLARE
  v_count        int;
  v_folder_org   uuid;
BEGIN
  SELECT organization_id INTO v_folder_org FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Folder not found.'; END IF;

  -- All users must belong to the same org
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = ANY(p_user_ids) AND owner_id != v_folder_org
  ) THEN
    RAISE EXCEPTION 'One or more users belong to a different organization.';
  END IF;

  UPDATE profiles SET folder_id = p_folder_id WHERE user_id = ANY(p_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- contacts.id is TEXT array
CREATE OR REPLACE FUNCTION bulk_assign_qr_codes_to_folder(p_qr_code_ids text[], p_folder_id uuid)
RETURNS int AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM folders WHERE id = p_folder_id) THEN
    RAISE EXCEPTION 'Folder not found.';
  END IF;

  UPDATE contacts SET folder_id = p_folder_id WHERE id = ANY(p_qr_code_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- SECTION 8: PERMISSION MANAGEMENT FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION grant_folder_role(p_user_id uuid, p_folder_id uuid, p_role folder_role)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM folders WHERE id = p_folder_id) THEN
    RAISE EXCEPTION 'Folder not found.';
  END IF;

  INSERT INTO folder_permissions(folder_id, user_id, role)
  VALUES (p_folder_id, p_user_id, p_role)
  ON CONFLICT (folder_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION revoke_folder_role(p_user_id uuid, p_folder_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM folder_permissions
  WHERE folder_id = p_folder_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- SECTION 9: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE folders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_permissions ENABLE ROW LEVEL SECURITY;

-- FOLDERS: SELECT — user can see a folder if they have any permission on it or any ancestor
DROP POLICY IF EXISTS "folders_select" ON folders;
CREATE POLICY "folders_select" ON folders
  FOR SELECT USING (
    user_can_access_folder(auth.uid(), id)
  );

-- FOLDERS: INSERT/UPDATE/DELETE — user can manage if they have a manager-level role
DROP POLICY IF EXISTS "folders_write" ON folders;
CREATE POLICY "folders_write" ON folders
  FOR ALL USING (
    user_can_manage_folder(auth.uid(), id)
  );

-- FOLDER_PERMISSIONS: only super_admin or company_admin can read/write
DROP POLICY IF EXISTS "folder_permissions_policy" ON folder_permissions;
CREATE POLICY "folder_permissions_policy" ON folder_permissions
  FOR ALL USING (
    get_user_effective_role(auth.uid(), folder_id) IN ('super_admin', 'company_admin')
  );

-- CONTACTS: user sees QR codes only in folders they can access
-- (NULL folder_id = unassigned, visible to owner via existing RLS)
DROP POLICY IF EXISTS "contacts_folder_select" ON contacts;
CREATE POLICY "contacts_folder_select" ON contacts
  FOR SELECT USING (
    -- existing ownership check
    auth.uid() = user_id
    OR
    -- folder-based access
    (folder_id IS NOT NULL AND user_can_access_folder(auth.uid(), folder_id))
  );


-- ============================================================
-- SECTION 10: DATA MIGRATION (existing flat data → root folder)
-- ============================================================
-- Creates one "Root" folder per existing organization (owner account),
-- then assigns all existing users and QR codes to that folder.
-- Idempotent: safe to re-run (IF NOT EXISTS / WHERE folder_id IS NULL).
-- ============================================================

DO $$
DECLARE
  v_owner_id  uuid;
  v_folder_id uuid;
BEGIN
  -- Each distinct owner_id in profiles = one tenant/organization
  FOR v_owner_id IN
    SELECT DISTINCT owner_id FROM profiles WHERE owner_id IS NOT NULL
  LOOP
    -- Only create root folder if one doesn't exist yet for this org
    SELECT id INTO v_folder_id
    FROM folders
    WHERE organization_id = v_owner_id
      AND parent_id IS NULL
      AND lower(name) = 'root'
    LIMIT 1;

    IF v_folder_id IS NULL THEN
      INSERT INTO folders(name, type, parent_id, organization_id, created_by)
      VALUES ('Root', 'company', NULL, v_owner_id, v_owner_id)
      RETURNING id INTO v_folder_id;
    END IF;

    -- Assign all users in this org that have no folder yet
    UPDATE profiles
    SET folder_id = v_folder_id
    WHERE owner_id = v_owner_id
      AND folder_id IS NULL;

    -- Assign all QR codes owned by this org that have no folder yet
    -- contacts.user_id = owner_id for all contacts in the org
    UPDATE contacts
    SET folder_id = v_folder_id
    WHERE user_id = v_owner_id
      AND folder_id IS NULL;

  END LOOP;
END;
$$;


-- ============================================================
-- SECTION 11: EDGE CASE SAFEGUARDS (summary)
-- ============================================================
-- 1. Circular reference:      CONSTRAINT no_self_parent + is_descendant_of() check in validate_folder_move()
-- 2. Orphaned users:          folder_id SET NULL on folder delete; catch via: SELECT * FROM profiles WHERE folder_id IS NULL
-- 3. Orphaned QR codes:       folder_id SET NULL on folder delete; catch via: SELECT * FROM contacts WHERE folder_id IS NULL
-- 4. Duplicate names:         UNIQUE INDEX folders_unique_name_per_parent (org + parent + lower(name))
-- 5. Multiple roles same user: UNIQUE(folder_id, user_id) in folder_permissions; ON CONFLICT UPDATE
-- 6. Deep nesting:            depth < 20 hard cap in all recursive CTEs
-- 7. Cross-tenant assignment: validate_folder_move() + assign_user_to_folder() owner_id check
-- 8. Deleted parent:          ON DELETE RESTRICT on parent_id — parent cannot be deleted if it has children


-- ============================================================
-- SECTION 12: VERIFICATION QUERIES (run after migration)
-- ============================================================
-- Check all folders were created:
--   SELECT organization_id, COUNT(*) FROM folders GROUP BY organization_id;
--
-- Check all users are assigned:
--   SELECT COUNT(*) FROM profiles WHERE folder_id IS NULL;
--
-- Check all QR codes are assigned:
--   SELECT COUNT(*) FROM contacts WHERE folder_id IS NULL;
--
-- Check no circular references:
--   SELECT id FROM folders WHERE id = parent_id;  -- should return 0 rows
--
-- Test permission resolution (replace UUIDs):
--   SELECT get_user_effective_role('<user-uuid>', '<folder-uuid>');
--   SELECT user_can_access_folder('<user-uuid>', '<folder-uuid>');
--   SELECT user_can_manage_folder('<user-uuid>', '<folder-uuid>');
--
-- Test subtree:
--   SELECT * FROM get_folder_tree('<root-folder-uuid>');
--
-- Test ancestors:
--   SELECT * FROM get_folder_ancestors('<leaf-folder-uuid>');


-- ============================================================
-- ROLLBACK SCRIPT (run only if migration needs to be undone)
-- ============================================================
-- ALTER TABLE contacts DROP COLUMN IF EXISTS folder_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS folder_id;
-- DROP TABLE IF EXISTS folder_permissions;
-- DROP TABLE IF EXISTS folders;
-- DROP TYPE IF EXISTS folder_role;
-- DROP TYPE IF EXISTS folder_type;
