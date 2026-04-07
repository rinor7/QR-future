import { getSupabaseBrowser } from "./supabase-browser";

export type FolderType = 'company' | 'subsidiary' | 'location' | 'department' | 'team' | 'custom';

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  parent_id: string | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FolderWithStats extends Folder {
  userCount: number;
  qrCount: number;
  children: FolderWithStats[];
}

export async function getAllFolders(organizationId: string): Promise<Folder[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Folder[];
}

export async function getFolderStats(
  organizationId: string
): Promise<Record<string, { users: number; qrs: number }>> {
  const supabase = getSupabaseBrowser();
  const [{ data: users }, { data: qrs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("folder_id")
      .eq("owner_id", organizationId)
      .not("folder_id", "is", null),
    supabase
      .from("contacts")
      .select("folder_id")
      .eq("user_id", organizationId)
      .not("folder_id", "is", null),
  ]);

  const stats: Record<string, { users: number; qrs: number }> = {};
  (users ?? []).forEach(({ folder_id }) => {
    if (!stats[folder_id]) stats[folder_id] = { users: 0, qrs: 0 };
    stats[folder_id].users++;
  });
  (qrs ?? []).forEach(({ folder_id }) => {
    if (!stats[folder_id]) stats[folder_id] = { users: 0, qrs: 0 };
    stats[folder_id].qrs++;
  });
  return stats;
}

export async function createFolder(
  name: string,
  type: FolderType,
  parentId: string | null,
  organizationId: string,
  createdBy: string
): Promise<Folder> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("create_folder", {
    p_name: name,
    p_type: type,
    p_parent_id: parentId,
    p_organization_id: organizationId,
    p_created_by: createdBy,
  });
  if (error) throw new Error(error.message);
  return data as Folder;
}

export async function updateFolder(
  folderId: string,
  name: string,
  type: FolderType
): Promise<Folder> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("update_folder", {
    p_folder_id: folderId,
    p_name: name,
    p_type: type,
  });
  if (error) throw new Error(error.message);
  return data as Folder;
}

export async function deleteFolderRpc(folderId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.rpc("delete_folder", {
    p_folder_id: folderId,
  });
  if (error) throw new Error(error.message);
}

export async function moveFolderRpc(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.rpc("move_folder", {
    p_folder_id: folderId,
    p_new_parent_id: newParentId,
  });
  if (error) throw new Error(error.message);
}

export async function assignQrToFolder(
  qrCodeId: string,
  folderId: string
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.rpc("assign_qr_code_to_folder", {
    p_qr_code_id: qrCodeId,
    p_folder_id: folderId,
  });
  if (error) throw new Error(error.message);
}

export async function assignUserToFolder(
  userId: string,
  folderId: string
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.rpc("assign_user_to_folder", {
    p_user_id: userId,
    p_folder_id: folderId,
  });
  if (error) throw new Error(error.message);
}

// Build a flat list into a nested tree
export function buildTree(
  folders: Folder[],
  stats: Record<string, { users: number; qrs: number }> = {}
): FolderWithStats[] {
  const map: Record<string, FolderWithStats> = {};
  folders.forEach((f) => {
    map[f.id] = {
      ...f,
      userCount: stats[f.id]?.users ?? 0,
      qrCount: stats[f.id]?.qrs ?? 0,
      children: [],
    };
  });

  const roots: FolderWithStats[] = [];
  folders.forEach((f) => {
    if (f.parent_id && map[f.parent_id]) {
      map[f.parent_id].children.push(map[f.id]);
    } else {
      roots.push(map[f.id]);
    }
  });

  // Roll up child counts into parent so displayed count is total for the subtree
  function rollUp(node: FolderWithStats): number {
    const childTotal = node.children.reduce((sum, c) => sum + rollUp(c), 0);
    node.qrCount = (stats[node.id]?.qrs ?? 0) + childTotal;
    return node.qrCount;
  }
  roots.forEach(rollUp);

  return roots;
}

// Flat list of all folder ids in a subtree (including root)
export function subtreeIds(node: FolderWithStats): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

export const FOLDER_TYPE_LABELS: Record<FolderType, string> = {
  company:    "Unternehmen",
  subsidiary: "Tochtergesellschaft",
  location:   "Standort",
  department: "Abteilung",
  team:       "Team",
  custom:     "Benutzerdefiniert",
};

export const FOLDER_TYPE_COLORS: Record<FolderType, string> = {
  company:    "bg-blue-100 text-blue-700",
  subsidiary: "bg-purple-100 text-purple-700",
  location:   "bg-green-100 text-green-700",
  department: "bg-orange-100 text-orange-700",
  team:       "bg-yellow-100 text-yellow-700",
  custom:     "bg-gray-100 text-gray-600",
};
