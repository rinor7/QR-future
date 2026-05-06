"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, Folder as FolderIcon, ChevronRight,
  X, ChevronDown,
} from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile, toggleContactActive, setFolderContactsActive } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getAllFolders, buildTree, assignQrToFolder, createFolder, subtreeIds, moveContactsOutOfFolders, clearProfilesFromFolders, deleteFolderSubtree, type FolderWithStats } from "@/lib/folders";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useQRUrl } from "@/lib/qr-url";

// ── Folder picker tree (recursive) ───────────────────────────────────────────
function FolderPickerNode({
  node,
  selected,
  onSelect,
  depth,
}: {
  node: FolderWithStats;
  selected: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selected === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-brand-surface-low"}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-brand-outline ${!hasChildren ? "invisible" : ""}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <FolderIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-brand-primary" : "text-brand-secondary"}`} />
        <span className={`flex-1 text-sm truncate ${isSelected ? "font-semibold text-brand-primary" : "text-brand-text"}`}>{node.name}</span>
        {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
      </div>
      {expanded && node.children.map((child) => (
        <FolderPickerNode key={child.id} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Bulk folder picker (multi-select with checkboxes) ──
function BulkFolderPickerNode({
  node,
  selected,
  onToggle,
  depth,
}: {
  node: FolderWithStats;
  selected: Set<string>;
  onToggle: (node: FolderWithStats) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isChecked = selected.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-slate-400 ${!hasChildren ? "invisible" : ""}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(node)}
          className="w-4 h-4 accent-red-500 shrink-0"
        />
        <FolderIcon className="w-4 h-4 shrink-0 text-blue-400" />
        <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-300">{node.name}</span>
        {node.qrCount > 0 && (
          <span className="text-[10px] font-semibold text-slate-400 shrink-0">{node.qrCount} QR</span>
        )}
      </div>
      {expanded && node.children.map((child) => (
        <BulkFolderPickerNode key={child.id} node={child} selected={selected} onToggle={onToggle} depth={depth + 1} />
      ))}
    </div>
  );
}

function FolderPicker({
  folders,
  currentFolderId,
  contactName,
  onSave,
  onClose,
  saving,
}: {
  folders: FolderWithStats[];
  currentFolderId: string | null;
  contactName: string;
  onSave: (folderId: string | null) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(currentFolderId);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface rounded-2xl shadow-ambient w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(195,197,217,0.3)" }}>
          <div>
            <h2 className="font-headline font-bold text-brand-text text-sm">In Ordner verschieben</h2>
            <p className="text-xs text-brand-outline mt-0.5 truncate max-w-[220px]">{contactName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-brand-outline hover:text-brand-text rounded-xl hover:bg-brand-surface-low transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-64 overflow-y-auto">
          {/* No folder option */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selected === null ? "bg-blue-50" : "hover:bg-brand-surface-low"}`}
            onClick={() => setSelected(null)}
          >
            <span className="w-4 h-4 shrink-0" />
            <X className="w-4 h-4 shrink-0 text-brand-outline" />
            <span className={`flex-1 text-sm ${selected === null ? "font-semibold text-brand-primary" : "text-brand-text-secondary"}`}>Kein Ordner</span>
            {selected === null && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
          </div>
          {folders.length > 0 && <div className="my-1.5" style={{ borderTop: "1px solid rgba(195,197,217,0.3)" }} />}
          {folders.map((f) => (
            <FolderPickerNode key={f.id} node={f} selected={selected} onSelect={setSelected} depth={0} />
          ))}
        </div>

        <div className="px-4 pb-4 flex gap-3">
          <button onClick={onClose} className="flex-1 text-brand-text-secondary py-2.5 rounded-xl text-sm font-medium hover:bg-brand-surface-low transition-colors" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
            Abbrechen
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving}
            className="flex-1 btn-primary disabled:opacity-50 py-2.5 flex items-center justify-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Full folder-tree navigation modal ─────────────────────────────────────────
function FolderTreeNavNode({
  node,
  qrCount,
  onNavigate,
  depth,
}: {
  node: FolderWithStats;
  qrCount: number;
  onNavigate: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
        style={{ paddingLeft: `${depth * 18 + 12}px` }}
        onClick={() => onNavigate(node.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-slate-400 ${!hasChildren ? "invisible" : ""}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <FolderIcon className="w-4 h-4 shrink-0 text-blue-500" />
        <span className="flex-1 text-sm truncate text-slate-700 dark:text-slate-200 group-hover:text-blue-600 font-medium">
          {node.name}
        </span>
        <span className="text-xs text-slate-400 shrink-0 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
          {qrCount}
        </span>
      </div>
      {expanded && node.children.map((child) => {
        // Each node's qrCount is the rolled-up subtree count from buildTree
        return (
          <FolderTreeNavNode
            key={child.id}
            node={child}
            qrCount={child.qrCount}
            onNavigate={onNavigate}
            depth={depth + 1}
          />
        );
      })}
    </div>
  );
}

function FolderTreeModal({
  tree,
  onNavigate,
  onClose,
  title,
  closeLabel,
}: {
  tree: FolderWithStats[];
  onNavigate: (id: string) => void;
  onClose: () => void;
  title: string;
  closeLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
          <h2 className="font-headline font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto">
          {tree.map((node) => (
            <FolderTreeNavNode key={node.id} node={node} qrCount={node.qrCount} onNavigate={onNavigate} depth={0} />
          ))}
        </div>
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CodesPage() {
  const { tr } = useLang();
  const buildQRUrl = useQRUrl();
  const { isAdmin } = useRole();
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const [folderTree, setFolderTree] = useState<FolderWithStats[]>([]);
  const [contactFolders, setContactFolders] = useState<Record<string, string | null>>({});
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Drag & drop
  const [dragContactId, setDragContactId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [assigningFolder, setAssigningFolder] = useState<string | null>(null);

  // Folder picker modal
  const [pickerContactId, setPickerContactId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  // View mode: grid or list
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Member filter (admin/owner only)
  const [filterByUser, setFilterByUser] = useState("all");
  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});
  const [togglingFolder, setTogglingFolder] = useState<string | null>(null);
  // Pause confirmation modal: { id, currentlyActive, isFolder, folderNode }
  const [pauseModal, setPauseModal] = useState<{ id: string; currentlyActive: boolean; isFolder: boolean; folderNode?: FolderWithStats } | null>(null);
  // Delete folder modal
  const [deleteFolderModal, setDeleteFolderModal] = useState<FolderWithStats | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  // Bulk-delete modal (combines: all QRs, all folders, pick specific folders)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDelAllQRs, setBulkDelAllQRs] = useState(false);
  const [bulkDelAllFolders, setBulkDelAllFolders] = useState(false);
  const [bulkPickFolders, setBulkPickFolders] = useState<Set<string>>(new Set());
  const [bulkDelContents, setBulkDelContents] = useState(true);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  // Folder-tree navigation modal
  const [folderTreeOpen, setFolderTreeOpen] = useState(false);
  // Departed-creator history modal + lookup map (email → departure metadata)
  const [departedMap, setDepartedMap] = useState<Record<string, { departedAt: string; name: string; role: string | null }>>({});
  const [departedModal, setDepartedModal] = useState<QRContact | null>(null);
  const PAGE_SIZE = 12;

  // New folder creation
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderNameError, setFolderNameError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllContacts(), getUserProfile()]).then(([data, profile]) => {
      setContacts(data);
      if (profile) {
        setPlan(profile.plan);
        setIsOwner(profile.userId === profile.ownerId);
        setOrgId(profile.ownerId);
        setUserId(profile.userId);
        getAllFolders(profile.ownerId).then((folders) => {
          setFolderTree(buildTree(folders));
        }).catch(() => {});
        // Load team members for admin/owner filter
        if (profile.role === "admin" || profile.userId === profile.ownerId) {
          fetch("/api/notifications?type=user_deleted&limit=200")
            .then((r) => r.json())
            .then(({ data }: { data?: { metadata: { email?: string; name?: string; role?: string } | null; created_at: string }[] }) => {
              if (!data) return;
              const map: Record<string, { departedAt: string; name: string; role: string | null }> = {};
              data.forEach((n) => {
                const email = n.metadata?.email;
                if (!email || map[email]) return;
                map[email] = {
                  departedAt: n.created_at,
                  name: n.metadata?.name ?? "",
                  role: n.metadata?.role ?? null,
                };
              });
              setDepartedMap(map);
            })
            .catch(() => {});
          getSupabaseBrowser()
            .from("profiles")
            .select("user_id, email, first_name, last_name")
            .eq("owner_id", profile.ownerId)
            .then(({ data: members }) => {
              if (members) {
                const map: Record<string, string> = {};
                const list = members.map((m: { user_id: string; email: string; first_name: string | null; last_name: string | null }) => {
                  const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
                  map[m.email] = name;
                  map[m.user_id] = name;
                  return { email: m.email, name };
                });
                setMemberMap(map);
                setTeamMembers(list);
              }
            });
        }
        getSupabaseBrowser()
          .from("contacts")
          .select("id, folder_id")
          .eq("user_id", profile.ownerId)
          .then(({ data: rows }) => {
            if (rows) {
              const map: Record<string, string | null> = {};
              rows.forEach((r: { id: string; folder_id: string | null }) => { map[r.id] = r.folder_id ?? null; });
              setContactFolders(map);
            }
          });
      }
    }).finally(() => setLoading(false));

    fetch("/api/scan/counts")
      .then((r) => r.json())
      .then(({ counts }) => { if (counts) setScanCounts(counts); })
      .catch(() => {});
  }, []);

  // Skip any auto-created "Root" folder — show its children as top-level instead
  const displayTree: FolderWithStats[] = (() => {
    if (folderTree.length === 1 && folderTree[0].name === "Root") {
      return folderTree[0].children;
    }
    return folderTree.filter((f) => f.name !== "Root");
  })();

  function findNode(nodes: FolderWithStats[], id: string): FolderWithStats | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  function buildPath(nodes: FolderWithStats[], id: string, path: FolderWithStats[] = []): FolderWithStats[] | null {
    for (const n of nodes) {
      if (n.id === id) return [...path, n];
      const found = buildPath(n.children, id, [...path, n]);
      if (found) return found;
    }
    return null;
  }

  const currentFolder = currentFolderId ? findNode(displayTree, currentFolderId) : null;
  const breadcrumb = currentFolderId ? (buildPath(displayTree, currentFolderId) ?? []) : [];

  const visibleFoldersAll = currentFolderId
    ? (currentFolder?.children ?? [])
    : displayTree;

  function contactMatchesUserFilter(c: QRContact): boolean {
    if (filterByUser === "all") return true;
    if (filterByUser === "__departed__") return c.originalCreatorDeleted === true;
    return c.createdBy === filterByUser;
  }

  function folderHasMatchingContacts(node: FolderWithStats): boolean {
    const idSet = new Set(subtreeIds(node));
    return contacts.some((c) => {
      const fid = contactFolders[c.id];
      return fid && idSet.has(fid) && contactMatchesUserFilter(c);
    });
  }

  const visibleFolders = filterByUser === "all"
    ? visibleFoldersAll
    : visibleFoldersAll.filter(folderHasMatchingContacts);

  const hasDepartedCards = contacts.some((c) => c.originalCreatorDeleted === true);

  function countInFolder(folderId: string): number {
    return Object.values(contactFolders).filter((v) => v === folderId).length;
  }

  function isFolderActive(node: FolderWithStats): boolean {
    const idSet = new Set(subtreeIds(node));
    return contacts.some((c) => {
      const cFolderId = contactFolders[c.id];
      return cFolderId && idSet.has(cFolderId) && c.isActive !== false;
    });
  }

  // Get siblings at the current creation level (for duplicate check)
  function getSiblings(): FolderWithStats[] {
    if (currentFolderId) {
      return findNode(displayTree, currentFolderId)?.children ?? [];
    }
    return displayTree;
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    // Duplicate name check
    const siblings = getSiblings();
    if (siblings.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setFolderNameError(`Ein Ordner namens "${name}" existiert bereits.`);
      return;
    }

    setSavingFolder(true);
    setFolderNameError(null);
    try {
      const parentId = currentFolderId;
      const newFolder = await createFolder(name, "custom", parentId, orgId, userId);
      if (!parentId) {
        await getSupabaseBrowser().rpc("grant_folder_role", {
          p_user_id: userId,
          p_folder_id: newFolder.id,
          p_role: "company_admin",
        });
      }
      const updated = await getAllFolders(orgId);
      setFolderTree(buildTree(updated));
      setNewFolderName("");
      setCreatingFolder(false);
    } finally {
      setSavingFolder(false);
    }
  }

  const filtered = contacts
    .filter((c) => {
      const matchesSearch =
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.isActive !== false) ||
        (statusFilter === "paused" && c.isActive === false);
      const matchesUser = contactMatchesUserFilter(c);
      if (!matchesSearch || !matchesStatus || !matchesUser) return false;
      if (search.trim()) return true;
      if (currentFolderId) return contactFolders[c.id] === currentFolderId;
      // Root view: show only uncategorized cards (no folder, or in the auto "Root" folder)
      const fid = contactFolders[c.id];
      if (!fid) return true;
      const assignedFolder = findNode(folderTree, fid);
      if (assignedFolder && assignedFolder.name === "Root") return true;
      return false;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });



  async function handleDelete(id: string) {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
  }

  async function handleTogglePause(id: string, currentlyActive: boolean) {
    setTogglingId(id);
    try {
      await toggleContactActive(id, !currentlyActive);
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !currentlyActive } : c));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTogglePauseConfirmed(id: string, currentlyActive: boolean) {
    setPauseModal(null);
    await handleTogglePause(id, currentlyActive);
  }

  async function handleToggleFolderConfirmed(node: FolderWithStats) {
    setPauseModal(null);
    await handleToggleFolder(node);
  }

  async function handleToggleFolder(node: FolderWithStats) {
    setTogglingFolder(node.id);
    try {
      const ids = subtreeIds(node);
      const idSet = new Set(ids);
      // Determine current state: if ANY contact in this folder is active, we pause all; if all paused, we activate all
      const folderContacts = contacts.filter((c) => {
        const cFolderId = contactFolders[c.id];
        return cFolderId && idSet.has(cFolderId);
      });
      const anyActive = folderContacts.some((c) => c.isActive !== false);
      const newState = !anyActive; // if any active → pause all; if all paused → activate all
      await setFolderContactsActive(ids, orgId, newState);
      setContacts((prev) => prev.map((c) => {
        const cFolderId = contactFolders[c.id];
        if (cFolderId && idSet.has(cFolderId)) return { ...c, isActive: newState };
        return c;
      }));
    } finally {
      setTogglingFolder(null);
    }
  }

  // Flatten the folder tree into a list (used by the picker + bulk-delete count)
  function flattenFolders(nodes: FolderWithStats[]): FolderWithStats[] {
    const out: FolderWithStats[] = [];
    function walk(n: FolderWithStats) {
      out.push(n);
      n.children.forEach(walk);
    }
    nodes.forEach(walk);
    return out;
  }

  // Resolve which folder ids the bulk operation targets (entire subtree of any picked folder)
  function getBulkFolderIds(): string[] {
    if (bulkDelAllFolders) {
      return flattenFolders(folderTree).map((n) => n.id);
    }
    const all = flattenFolders(folderTree);
    const idSet = new Set<string>();
    all.forEach((n) => {
      if (bulkPickFolders.has(n.id)) {
        subtreeIds(n).forEach((id) => idSet.add(id));
      }
    });
    return Array.from(idSet);
  }

  function getBulkQRTargetIds(): string[] {
    if (bulkDelAllQRs) return contacts.map((c) => c.id);
    if (bulkDelContents) {
      const folderIds = new Set(getBulkFolderIds());
      return contacts
        .filter((c) => {
          const fid = contactFolders[c.id];
          return fid && folderIds.has(fid);
        })
        .map((c) => c.id);
    }
    return [];
  }

  function openBulkDelete() {
    setBulkDelAllQRs(false);
    setBulkDelAllFolders(false);
    setBulkPickFolders(new Set());
    setBulkDelContents(true);
    setBulkPickerOpen(false);
    setBulkDeleteOpen(true);
  }

  function toggleBulkPickFolder(node: FolderWithStats) {
    setBulkPickFolders((prev) => {
      const next = new Set(prev);
      const ids = subtreeIds(node);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    setDeletingBulk(true);
    try {
      const folderIds = getBulkFolderIds();
      const qrIdsToDelete = new Set<string>();

      if (bulkDelAllQRs) {
        contacts.forEach((c) => qrIdsToDelete.add(c.id));
      } else if (folderIds.length > 0 && bulkDelContents) {
        const folderIdSet = new Set(folderIds);
        contacts.forEach((c) => {
          const fid = contactFolders[c.id];
          if (fid && folderIdSet.has(fid)) qrIdsToDelete.add(c.id);
        });
      }

      // Delete QR codes
      for (const id of Array.from(qrIdsToDelete)) {
        await deleteContact(id);
      }

      // Handle folders: if not deleting their QRs, move QRs out first
      if (folderIds.length > 0) {
        if (!bulkDelAllQRs && !bulkDelContents) {
          await moveContactsOutOfFolders(folderIds, orgId);
        }
        await clearProfilesFromFolders(folderIds);
        // Delete from leaves up — flatten + reverse-sort by depth
        const allNodes = flattenFolders(folderTree);
        const targeted = allNodes.filter((n) => folderIds.includes(n.id));
        // Use deleteFolderSubtree on roots within selection so child loop works
        const targetedSet = new Set(folderIds);
        const rootsInSelection = targeted.filter((n) => !n.parent_id || !targetedSet.has(n.parent_id));
        for (const root of rootsInSelection) {
          await deleteFolderSubtree(root);
        }
      }

      // Update local state
      if (qrIdsToDelete.size > 0) {
        setContacts((prev) => prev.filter((c) => !qrIdsToDelete.has(c.id)));
        setContactFolders((prev) => {
          const next = { ...prev };
          qrIdsToDelete.forEach((id) => { delete next[id]; });
          return next;
        });
      }
      if (folderIds.length > 0) {
        // If QRs survived but their folder was deleted, set folder to null locally
        if (!bulkDelAllQRs && !bulkDelContents) {
          const folderIdSet = new Set(folderIds);
          setContactFolders((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((cid) => {
              const fid = next[cid];
              if (fid && folderIdSet.has(fid)) next[cid] = null;
            });
            return next;
          });
        }
        const updated = await getAllFolders(orgId);
        setFolderTree(buildTree(updated));
        // If we were inside a deleted folder, navigate out
        if (currentFolderId && folderIds.includes(currentFolderId)) {
          setCurrentFolderId(null);
        }
      }

      setBulkDeleteOpen(false);
    } finally {
      setDeletingBulk(false);
    }
  }

  async function handleDeleteFolder(node: FolderWithStats, mode: "move" | "delete") {
    setDeletingFolder(true);
    try {
      const ids = subtreeIds(node);
      const idSet = new Set(ids);
      const subtreeContactIds = contacts
        .filter((c) => {
          const fid = contactFolders[c.id];
          return fid && idSet.has(fid);
        })
        .map((c) => c.id);

      if (mode === "delete") {
        for (const id of subtreeContactIds) {
          await deleteContact(id);
        }
        setContacts((prev) => prev.filter((c) => !subtreeContactIds.includes(c.id)));
        setContactFolders((prev) => {
          const next = { ...prev };
          subtreeContactIds.forEach((id) => { delete next[id]; });
          return next;
        });
      } else {
        await moveContactsOutOfFolders(ids, orgId);
        setContactFolders((prev) => {
          const next = { ...prev };
          subtreeContactIds.forEach((id) => { next[id] = null; });
          return next;
        });
      }

      await clearProfilesFromFolders(ids);
      await deleteFolderSubtree(node);

      const updated = await getAllFolders(orgId);
      setFolderTree(buildTree(updated));

      // If we were inside the deleted folder (or one of its descendants), navigate out
      if (currentFolderId && idSet.has(currentFolderId)) {
        setCurrentFolderId(node.parent_id);
      }
      setDeleteFolderModal(null);
    } finally {
      setDeletingFolder(false);
    }
  }

  async function handleAssignFolder(contactId: string, folderId: string | null) {
    setAssigningFolder(contactId);
    try {
      if (!folderId) {
        await getSupabaseBrowser().from("contacts").update({ folder_id: null }).eq("id", contactId);
        setContactFolders((prev) => ({ ...prev, [contactId]: null }));
      } else {
        await assignQrToFolder(contactId, folderId);
        setContactFolders((prev) => ({ ...prev, [contactId]: folderId }));
        // Give the QR's creator read access to the target folder so they can
        // see their own card in context. No-op if they already have a role.
        fetch("/api/folders/grant-creator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId, folderId }),
        }).catch(() => {});
      }
    } finally {
      setAssigningFolder(null);
    }
  }

  // Drag
  function handleDragStart(e: React.DragEvent, contactId: string) {
    setDragContactId(contactId);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd() { setDragContactId(null); setDragOverId(null); }
  async function handleDropOnFolder(folderId: string) {
    if (!dragContactId) return;
    setDragOverId(null);
    await handleAssignFolder(dragContactId, folderId);
    setDragContactId(null);
  }
  async function handleDropOnRoot() {
    if (!dragContactId) return;
    setDragOverId(null);
    await handleAssignFolder(dragContactId, null);
    setDragContactId(null);
  }

  function handleDownloadQR(id: string, logoUrl?: string, showLogoInQr?: boolean) {
    if (!showLogoInQr) logoUrl = undefined;
    const svgEl = document.querySelector(`#qr-${id} svg`) as SVGElement;
    if (!svgEl) return;
    const exportSize = 400;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(exportSize));
    clone.setAttribute("height", String(exportSize));
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d")!;
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, exportSize, exportSize);
      URL.revokeObjectURL(svgUrl);
      const finish = () => {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `qr-${id}.png`;
        a.click();
      };
      if (logoUrl) {
        const logoSize = Math.round(exportSize * 0.32);
        const padding = Math.round(logoSize * 0.1);
        const offset = (exportSize - logoSize) / 2;
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const scale = Math.min(logoSize / logoImg.naturalWidth, logoSize / logoImg.naturalHeight);
          const drawW = logoImg.naturalWidth * scale;
          const drawH = logoImg.naturalHeight * scale;
          const drawX = offset + (logoSize - drawW) / 2;
          const drawY = offset + (logoSize - drawH) / 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(offset - padding, offset - padding, logoSize + padding * 2, logoSize + padding * 2);
          ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
          finish();
        };
        logoImg.onerror = finish;
        logoImg.src = logoUrl;
      } else {
        finish();
      }
    };
    qrImg.src = svgUrl;
  }

  // Reset to page 1 whenever the view changes
  useEffect(() => { setPage(1); }, [currentFolderId, search, statusFilter, sortBy, filterByUser]);

  const limit = PLAN_LIMITS[plan];
  const limitReached = limit !== -1 && contacts.length >= limit;
  const hasFolders = displayTree.length > 0;
  const isDragging = !!dragContactId;
  // Max 3 levels: root (depth 0), child (depth 1), grandchild (depth 2)
  // breadcrumb.length equals current depth (0 = root view, 1 = inside level-1 folder, etc.)
  const canCreateFolder = breadcrumb.length < 3;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pickerContact = pickerContactId ? contacts.find((c) => c.id === pickerContactId) : null;

  return (
    <div className="pt-6 pb-12 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <h1 className="font-headline text-3xl sm:text-[3.5rem] font-bold leading-none tracking-tighter mb-2">{tr.codes_page_title}</h1>
          <p className="text-on-surface-variant font-medium">{tr.codes_page_subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={currentFolderId ? `/api/qr/export?folder_id=${currentFolderId}` : "/api/qr/export"}
            download
            className="flex items-center gap-2 bg-gray-100 dark:bg-[#242736] px-5 py-3 rounded-xl font-headline font-semibold text-blue-600 hover:bg-gray-200 dark:hover:bg-[#2a2e3e] transition-colors"
          >
            <span className="material-symbols-outlined">file_download</span>
            {currentFolderId ? tr.codes_export_folder : tr.codes_export_csv}
          </a>
          {!limitReached && (
            <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 px-6 py-3 font-headline font-bold shadow-lg">
              <span className="material-symbols-outlined">add_circle</span>
              {tr.create_qr}
            </Link>
          )}
          {limitReached && isOwner && (
            <Link href="/dashboard/upgrade" className="btn-primary flex items-center gap-2 px-6 py-3 font-headline font-bold shadow-lg">
              {tr.upgrade_plan_btn}
            </Link>
          )}
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 mb-8 text-sm">
          <button onClick={() => setCurrentFolderId(null)} className="flex items-center gap-1.5 text-outline hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {tr.codes_back_to_codes}
          </button>
          {breadcrumb.map((seg, i) => (
            <span key={seg.id} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-outline">chevron_right</span>
              {i === breadcrumb.length - 1 ? (
                <span className="font-semibold text-on-surface">{seg.name}</span>
              ) : (
                <button onClick={() => setCurrentFolderId(seg.id)} className="text-outline hover:text-primary transition-colors">{seg.name}</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input
            type="text"
            placeholder={tr.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 dark:bg-[#242736] text-slate-900 dark:text-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "paused")} className="bg-gray-100 dark:bg-[#242736] text-slate-700 dark:text-slate-300 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
          <option value="all">{tr.filter_all}</option>
          <option value="active">{tr.filter_active}</option>
          <option value="paused">{tr.filter_paused}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name")} className="bg-gray-100 dark:bg-[#242736] text-slate-700 dark:text-slate-300 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
          <option value="newest">{tr.sort_newest}</option>
          <option value="oldest">{tr.sort_oldest}</option>
          <option value="name">{tr.sort_name}</option>
        </select>
        {isAdmin && (teamMembers.length > 1 || hasDepartedCards) && (
          <select
            value={filterByUser}
            onChange={(e) => setFilterByUser(e.target.value)}
            className="bg-gray-100 dark:bg-[#242736] text-slate-700 dark:text-slate-300 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{tr.codes_all_members}</option>
            {teamMembers.map((m) => (
              <option key={m.email} value={m.email}>{m.name}</option>
            ))}
            {hasDepartedCards && (
              <>
                <option disabled value="__divider__">{tr.codes_departed_divider}</option>
                <option value="__departed__">{tr.codes_departed_members}</option>
              </>
            )}
          </select>
        )}
        {canCreateFolder && (
          <button onClick={() => { setCreatingFolder(true); setFolderNameError(null); setNewFolderName(""); }} className="flex items-center gap-2 bg-gray-100 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-gray-200 dark:hover:bg-[#2a2e3e] transition-colors">
            <span className="material-symbols-outlined text-base">create_new_folder</span>
            {tr.codes_new_folder}
          </button>
        )}
      </div>

      {/* ── New folder form ── */}
      {creatingFolder && (
        <form onSubmit={handleCreateFolder} className="mb-8 bg-surface-container-lowest rounded-xl px-5 py-4 shadow-sm border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">create_new_folder</span>
            <input autoFocus value={newFolderName} onChange={(e) => { setNewFolderName(e.target.value); setFolderNameError(null); }}
              placeholder={currentFolderId ? tr.codes_subfolder_ph : tr.codes_folder_ph}
              className="flex-1 text-sm focus:outline-none bg-transparent text-on-surface" />
            <button type="submit" disabled={savingFolder || !newFolderName.trim()} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-50">
              {savingFolder ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-sm">check</span>}
              {tr.codes_create_folder_btn}
            </button>
            <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName(""); setFolderNameError(null); }} className="p-2 text-outline hover:text-on-surface rounded-xl hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          {folderNameError && <p className="mt-2 text-xs text-error">{folderNameError}</p>}
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── Folders section ── */}
          {!search.trim() && visibleFolders.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline text-xs font-extrabold uppercase tracking-widest text-outline">{tr.codes_folders_section}</h3>
                <button onClick={() => setFolderTreeOpen(true)} className="text-primary text-sm font-semibold hover:underline">{tr.codes_view_all_folders}</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {visibleFolders.map((folder) => {
                  const isDragTarget = dragOverId === folder.id;
                  const qrCount = countInFolder(folder.id);
                  return (
                    <div
                      key={folder.id}
                      className={`relative rounded-2xl flex flex-col items-center justify-center p-5 pb-4 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden shrink-0 w-40 sm:w-44 ${isDragTarget ? "ring-2 ring-white/50" : ""}`}
                      style={{ background: "linear-gradient(145deg, #5b7fff 0%, #3d5cff 60%, #2f4de0 100%)" }}
                      onClick={() => !isDragging && setCurrentFolderId(folder.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(folder.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }}
                      onDrop={(e) => { e.preventDefault(); handleDropOnFolder(folder.id); }}
                    >
                      {/* Subtle inner highlight */}
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-2xl pointer-events-none" />
                      {/* Folder icon */}
                      <span className="material-symbols-outlined text-[52px] text-white/90 group-hover:text-white transition-colors mb-2 relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>folder_open</span>
                      <div className="text-center relative z-10 w-full min-w-0">
                        <h4 className="font-headline font-bold text-white truncate text-sm leading-tight">{folder.name}</h4>
                        <p className="text-xs font-medium text-blue-100 mt-0.5">{qrCount} {qrCount === 1 ? tr.codes_qr_singular : tr.codes_qr_plural}</p>
                        {(isAdmin || isOwner) && folder.created_by && folder.created_by !== userId && (
                          <span className="inline-flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold" title={`Created by ${memberMap[folder.created_by] ?? "team member"}`}>
                            <span className="material-symbols-outlined text-[10px]">person</span>
                            <span className="truncate max-w-[90px]">{memberMap[folder.created_by] ?? "team"}</span>
                          </span>
                        )}
                      </div>
                      {(() => {
                        const folderHasActive = isFolderActive(folder);
                        const canToggle = isAdmin || isOwner || folder.created_by === userId;
                        return (
                          <>
                            {canToggle && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setPauseModal({ id: folder.id, currentlyActive: folderHasActive, isFolder: true, folderNode: folder }); }}
                                disabled={togglingFolder === folder.id}
                                title={folderHasActive ? tr.codes_pause_folder : tr.codes_activate_folder}
                                className={`absolute top-2 right-10 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:bg-white/20 ${folderHasActive ? "text-white" : "text-green-200"}`}
                              >
                                {togglingFolder === folder.id
                                  ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                  : <span className="material-symbols-outlined text-[16px]">{folderHasActive ? "pause_circle" : "play_circle"}</span>
                                }
                              </button>
                            )}
                            {(isAdmin || isOwner) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteFolderModal(folder); }}
                                title={tr.codes_delete_folder}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg transition-all text-white hover:bg-white/20"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Remove-from-folder drop zone */}
          {currentFolder && isDragging && (
            <div
              className={`mb-6 border-2 border-dashed rounded-2xl p-4 text-center text-sm font-medium transition-colors ${dragOverId === "__remove__" ? "border-error bg-error-container/20 text-error" : "border-outline-variant/50 text-outline"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverId("__remove__"); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => { e.preventDefault(); handleDropOnRoot(); }}
            >
              {tr.codes_drag_remove}
            </div>
          )}

          {/* ── QR Codes grid ── */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline text-xs font-extrabold uppercase tracking-widest text-outline">
                {currentFolder ? `${tr.codes_qrs_in_folder_prefix} ${currentFolder.name.toUpperCase()}` : tr.codes_recent_section}
              </h3>
              <div className="flex items-center gap-1">
                {(isAdmin || isOwner) && (contacts.length > 0 || flattenFolders(folderTree).length > 0) && (
                  <button
                    onClick={openBulkDelete}
                    title="Bulk delete"
                    className="flex items-center gap-1.5 px-3 h-10 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold mr-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    <span className="hidden sm:inline">Bulk Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-gray-200 dark:bg-[#2a2e3e] text-blue-600" : "text-slate-400 hover:bg-gray-100 dark:hover:bg-[#242736]"}`}
                >
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-gray-200 dark:bg-[#2a2e3e] text-blue-600" : "text-slate-400 hover:bg-gray-100 dark:hover:bg-[#242736]"}`}
                >
                  <span className="material-symbols-outlined">list</span>
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-outline">
                {currentFolder ? (
                  <>
                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">folder_open</span>
                    <p className="text-base font-medium">Ordner ist leer</p>
                    <p className="text-sm mt-1">QR-Code hinziehen oder über den Ordner-Button verschieben.</p>
                  </>
                ) : (
                  <p className="text-lg">{tr.no_results}</p>
                )}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
                {paginated.map((contact) => {
                  const folderId = contactFolders[contact.id];
                  const folderNode = folderId ? findNode(displayTree, folderId) : null;
                  const folderName = folderNode?.name ?? null;
                  return viewMode === "grid" ? (
                      /* ── GRID card ── */
                      <div
                        key={contact.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contact.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-2xl flex flex-row overflow-hidden group border border-slate-100 shadow-sm hover:shadow-[0px_8px_32px_rgba(25,28,30,0.10)] transition-all ${dragContactId === contact.id ? "opacity-50" : ""} ${contact.isActive === false ? "opacity-60 grayscale-[30%]" : ""} cursor-grab active:cursor-grabbing`}
                      >
                        {/* Left content */}
                        <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">Business Card</span>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${contact.isActive !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {contact.isActive !== false ? "Active" : "Paused"}
                              </span>
                            </div>
                            <h4 className="text-2xl font-headline font-bold text-slate-900 mb-1 leading-tight">
                              {`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}
                            </h4>
                            {contact.title && <p className="text-primary font-semibold text-sm mb-0.5">{contact.title}</p>}
                            {contact.company && <p className="text-slate-500 text-sm mb-5">{contact.company}</p>}
                            <div className="flex items-center gap-4 sm:gap-8 mt-2 flex-wrap">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Created</span>
                                <span className="text-sm font-semibold text-slate-800">{new Date(contact.createdAt).toLocaleDateString("de-DE")}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Scans</span>
                                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs text-slate-500">trending_up</span>
                                  {scanCounts[contact.id] ?? 0} Scans
                                </span>
                              </div>
                              {hasFolders && (
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Folder</span>
                                  <button onClick={() => setPickerContactId(contact.id)} className="text-sm font-semibold text-primary hover:underline">{folderName ?? "None"}</button>
                                </div>
                              )}
                              {isAdmin && contact.createdBy && (
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Created by</span>
                                  {(() => {
                                    const name = memberMap[contact.createdBy];
                                    const hasName = name && name !== contact.createdBy;
                                    return hasName ? (
                                      <>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block leading-tight">{name}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block leading-tight">{contact.createdBy}</span>
                                      </>
                                    ) : (
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{contact.createdBy}</span>
                                    );
                                  })()}
                                  {contact.originalCreatorDeleted && (
                                    <button
                                      onClick={() => setDepartedModal(contact)}
                                      title={tr.departed_badge_tooltip}
                                      className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[10px]">person_off</span>
                                      departed
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-5 pt-4 border-t border-slate-100 dark:border-[#242736]">
                            {(
                              <Link href={`/dashboard/edit/${contact.id}`} title="Edit" className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <span className="material-symbols-outlined text-[17px]">edit</span>
                              </Link>
                            )}
                            <Link href={`/dashboard/analytics/${contact.id}`} title="Analytics" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">analytics</span>
                            </Link>
                            <button onClick={() => { navigator.clipboard.writeText(buildQRUrl(contact.id)); setCopiedId(contact.id); setTimeout(() => setCopiedId(null), 2000); }} title="Copy link" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">{copiedId === contact.id ? "check" : "content_copy"}</span>
                            </button>
                            <a href={buildQRUrl(contact.id)} target="_blank" title="Open page" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                            </a>
                            <button onClick={() => handleDownloadQR(contact.id, contact.logoUrl, contact.showLogoInQr)} title="Download QR" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">download</span>
                            </button>
                            {(
                              <button onClick={() => setPauseModal({ id: contact.id, currentlyActive: contact.isActive !== false, isFolder: false })} disabled={togglingId === contact.id} title={contact.isActive !== false ? "Pause" : "Activate"} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${contact.isActive !== false ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
                                <span className="material-symbols-outlined text-[17px]">{contact.isActive !== false ? "pause" : "play_arrow"}</span>
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => setDeleteModal(contact.id)} title="Delete" className="w-8 h-8 flex items-center justify-center text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Right QR panel — dark */}
                        <div className="w-[130px] shrink-0 flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}>
                          <div id={`qr-${contact.id}`} className="p-2 bg-white rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <QRCodeDisplay value={buildQRUrl(contact.id)} size={90} logoUrl={contact.showLogoInQr ? contact.logoUrl : undefined} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── LIST row ── */
                      <div
                        key={contact.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contact.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-xl flex items-center gap-4 px-5 py-4 border border-slate-100 shadow-sm hover:shadow-md transition-all group ${dragContactId === contact.id ? "opacity-50" : ""} ${contact.isActive === false ? "opacity-60 grayscale-[30%]" : ""} cursor-grab active:cursor-grabbing`}
                      >
                        {/* QR thumb */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1 bg-slate-900">
                          <QRCodeDisplay value={buildQRUrl(contact.id)} size={56} logoUrl={contact.showLogoInQr ? contact.logoUrl : undefined} />
                        </div>
                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-headline font-bold text-slate-900 truncate">{`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${contact.isActive !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {contact.isActive !== false ? "Active" : "Paused"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{contact.title}{contact.title && contact.company ? " · " : ""}{contact.company}</p>
                        </div>
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6 shrink-0 text-sm text-slate-500">
                          <span>{new Date(contact.createdAt).toLocaleDateString("de-DE")}</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">trending_up</span>
                            {scanCounts[contact.id] ?? 0}
                          </span>
                          {isAdmin && contact.createdBy && (
                            <span className="hidden lg:flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">person</span>
                              {(() => {
                                const name = memberMap[contact.createdBy];
                                const hasName = name && name !== contact.createdBy;
                                return hasName ? (
                                  <span className="flex flex-col leading-tight">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{name}</span>
                                    <span className="text-[10px] text-slate-400">{contact.createdBy}</span>
                                  </span>
                                ) : (
                                  <span>{contact.createdBy}</span>
                                );
                              })()}
                              {contact.originalCreatorDeleted && (
                                <button
                                  onClick={() => setDepartedModal(contact)}
                                  title={tr.departed_badge_tooltip}
                                  className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[9px]">person_off</span>
                                  departed
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {(
                            <Link href={`/dashboard/edit/${contact.id}`} title="Edit" className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-blue-50 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </Link>
                          )}
                          <Link href={`/dashboard/analytics/${contact.id}`} title="Analytics" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-purple-600 hover:bg-purple-50 transition-colors">
                            <span className="material-symbols-outlined text-[17px]">analytics</span>
                          </Link>
                          <button onClick={() => { navigator.clipboard.writeText(buildQRUrl(contact.id)); setCopiedId(contact.id); setTimeout(() => setCopiedId(null), 2000); }} title="Copy link" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors">
                            <span className="material-symbols-outlined text-[17px]">{copiedId === contact.id ? "check" : "content_copy"}</span>
                          </button>
                          <button onClick={() => handleDownloadQR(contact.id, contact.logoUrl, contact.showLogoInQr)} title="Download QR" className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors">
                            <span className="material-symbols-outlined text-[17px]">download</span>
                          </button>
                          {(
                            <button
                              onClick={() => setPauseModal({ id: contact.id, currentlyActive: contact.isActive !== false, isFolder: false })}
                              disabled={togglingId === contact.id}
                              title={contact.isActive !== false ? "Pause" : "Activate"}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${contact.isActive !== false ? "text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`}
                            >
                              <span className="material-symbols-outlined text-[17px]">{contact.isActive !== false ? "pause" : "play_arrow"}</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setDeleteModal(contact.id)} title="Delete" className="w-8 h-8 flex items-center justify-center text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                  );
                })}

                {/* New QR Code dashed card */}
                {!limitReached && (
                  <Link href="/dashboard/create" className="bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-10 text-center group hover:border-primary/40 hover:bg-blue-50/30 transition-all cursor-pointer min-h-[280px]">
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <span className="material-symbols-outlined text-2xl">add</span>
                    </div>
                    <h4 className="font-headline font-bold text-slate-900 mb-1 text-lg">New QR Code</h4>
                    <p className="text-sm text-slate-400 max-w-[200px]">Create a new digital business card or redirect link.</p>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-10 pt-6" style={{ borderTop: "1px solid rgba(195,197,217,0.3)" }}>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span> QR codes
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-5 py-2.5 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#242736] text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors disabled:opacity-40 shadow-sm">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-5 py-2.5 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-40" style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Departed creator history modal ── */}
      {departedModal && (() => {
        const c = departedModal;
        const email = c.createdBy ?? "";
        const info = email ? departedMap[email] : undefined;
        const displayName = info?.name || memberMap[email] || email || tr.departed_modal_unknown;
        const departedAt = info?.departedAt ? new Date(info.departedAt).toLocaleString("de-DE") : tr.departed_modal_unknown;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDepartedModal(null)}>
            <div
              className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full mx-auto mb-4">
                <span className="material-symbols-outlined text-amber-500">person_off</span>
              </div>
              <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
                {tr.departed_modal_title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5">
                {tr.departed_modal_subtitle}
              </p>
              <div className="space-y-2.5 mb-5">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5 text-[20px]">person</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{tr.departed_modal_creator}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                    {email && info?.name && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>}
                  </div>
                </div>
                {info?.role && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="material-symbols-outlined text-slate-400 mt-0.5 text-[20px]">badge</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{tr.departed_modal_role}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{info.role}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5 text-[20px]">add_circle</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{tr.departed_modal_card_created}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{new Date(c.createdAt).toLocaleString("de-DE")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <span className="material-symbols-outlined text-amber-500 mt-0.5 text-[20px]">person_off</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider mb-0.5">{tr.departed_modal_left}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{departedAt}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDepartedModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {tr.departed_modal_close}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Folder tree navigation modal ── */}
      {folderTreeOpen && (
        <FolderTreeModal
          tree={displayTree}
          title={tr.codes_view_all_folders}
          closeLabel={tr.codes_folder_tree_close}
          onClose={() => setFolderTreeOpen(false)}
          onNavigate={(id) => {
            setCurrentFolderId(id);
            setFolderTreeOpen(false);
          }}
        />
      )}

      {/* ── Folder picker modal ── */}
      {pickerContactId && pickerContact && (
        <FolderPicker
          folders={displayTree}
          currentFolderId={contactFolders[pickerContactId] ?? null}
          contactName={`${pickerContact.firstName} ${pickerContact.lastName}`.trim() || pickerContact.company || pickerContact.id}
          saving={assigningFolder === pickerContactId}
          onClose={() => setPickerContactId(null)}
          onSave={async (folderId) => {
            await handleAssignFolder(pickerContactId, folderId);
            setPickerContactId(null);
          }}
        />
      )}

      {/* ── Pause confirmation modal ── */}
      {pauseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] max-w-sm w-full p-6">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${pauseModal.currentlyActive ? "bg-amber-50" : "bg-green-50"}`}>
              <span className={`material-symbols-outlined text-2xl ${pauseModal.currentlyActive ? "text-amber-500" : "text-green-500"}`}>
                {pauseModal.currentlyActive ? "pause_circle" : "play_circle"}
              </span>
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100 text-center mb-2">
              {pauseModal.currentlyActive
                ? (pauseModal.isFolder ? tr.pause_modal_pause_folder : tr.pause_modal_pause_qr)
                : (pauseModal.isFolder ? tr.pause_modal_activate_folder : tr.pause_modal_activate_qr)}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-2">
              {pauseModal.currentlyActive
                ? (pauseModal.isFolder ? tr.pause_modal_pause_body_folder : tr.pause_modal_pause_body)
                : (pauseModal.isFolder ? tr.pause_modal_activate_body_folder : tr.pause_modal_activate_body)}
            </p>
            {pauseModal.currentlyActive && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 mb-4">
                {tr.pause_modal_redirect_note_prefix} <span className="font-semibold">qr-card.ch</span>
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPauseModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {tr.pause_modal_cancel}
              </button>
              <button
                onClick={() => {
                  if (pauseModal.isFolder && pauseModal.folderNode) {
                    handleToggleFolderConfirmed(pauseModal.folderNode);
                  } else {
                    handleTogglePauseConfirmed(pauseModal.id, pauseModal.currentlyActive);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${pauseModal.currentlyActive ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"}`}
              >
                {pauseModal.currentlyActive ? tr.pause_modal_confirm_pause : tr.pause_modal_confirm_activate}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete modal ── */}
      {bulkDeleteOpen && (() => {
        const totalQRCount = contacts.length;
        const totalFolderCount = flattenFolders(folderTree).length;
        const targetedFolderIds = getBulkFolderIds();
        const targetedQRIds = getBulkQRTargetIds();
        const hasFolderSelection = bulkDelAllFolders || bulkPickFolders.size > 0;
        const hasAnySelection = bulkDelAllQRs || hasFolderSelection;
        // When "All QR codes" is checked, the contents toggle is moot (QRs are going regardless)
        const contentsToggleDisabled = bulkDelAllQRs;
        const effectiveDelContents = bulkDelAllQRs ? true : bulkDelContents;

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
                <span className="material-symbols-outlined text-red-500">delete_sweep</span>
              </div>
              <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">Bulk Delete</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5">Choose what you want to remove. This cannot be undone.</p>

              {/* All QR codes */}
              <label className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${bulkDelAllQRs ? "border-red-300 bg-red-50/40 dark:bg-red-900/10" : "border-slate-200 dark:border-slate-700"} cursor-pointer mb-3`}>
                <input
                  type="checkbox"
                  checked={bulkDelAllQRs}
                  onChange={(e) => setBulkDelAllQRs(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-red-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">All QR codes ({totalQRCount})</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Permanently delete every QR code in your account.</p>
                </div>
              </label>

              {/* All folders */}
              <label className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${bulkDelAllFolders ? "border-red-300 bg-red-50/40 dark:bg-red-900/10" : "border-slate-200 dark:border-slate-700"} cursor-pointer mb-2`}>
                <input
                  type="checkbox"
                  checked={bulkDelAllFolders}
                  onChange={(e) => {
                    setBulkDelAllFolders(e.target.checked);
                    if (e.target.checked) {
                      setBulkPickFolders(new Set());
                      setBulkPickerOpen(false);
                    }
                  }}
                  disabled={totalFolderCount === 0}
                  className="mt-0.5 w-4 h-4 accent-red-500 disabled:opacity-40"
                />
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${totalFolderCount === 0 ? "text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>All folders ({totalFolderCount})</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{totalFolderCount === 0 ? "No folders to delete." : "Delete every folder, including subfolders."}</p>
                </div>
              </label>

              {/* Pick specific folders toggle */}
              {totalFolderCount > 0 && !bulkDelAllFolders && (
                <button
                  type="button"
                  onClick={() => setBulkPickerOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-3"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                    Or pick specific folders {bulkPickFolders.size > 0 && <span className="text-red-500 font-semibold">({bulkPickFolders.size})</span>}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">{bulkPickerOpen ? "expand_less" : "expand_more"}</span>
                </button>
              )}

              {/* Folder picker tree */}
              {bulkPickerOpen && !bulkDelAllFolders && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 mb-3 max-h-56 overflow-y-auto">
                  {folderTree.map((node) => (
                    <BulkFolderPickerNode
                      key={node.id}
                      node={node}
                      selected={bulkPickFolders}
                      onToggle={toggleBulkPickFolder}
                      depth={0}
                    />
                  ))}
                </div>
              )}

              {/* Contents sub-toggle (only when folders are being deleted) */}
              {hasFolderSelection && (
                <label className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#242736] mb-4 ${contentsToggleDisabled ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    checked={effectiveDelContents}
                    disabled={contentsToggleDisabled}
                    onChange={(e) => setBulkDelContents(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-red-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">Also delete QR codes inside these folders</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {contentsToggleDisabled
                        ? "All QR codes are already being deleted."
                        : effectiveDelContents
                          ? "QR codes inside selected folders will be permanently deleted."
                          : "QR codes inside selected folders will be moved to the root before the folder is deleted."}
                    </p>
                  </div>
                </label>
              )}

              {/* Summary */}
              {hasAnySelection && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-5">
                  Will delete:{" "}
                  <span className="font-bold">
                    {targetedQRIds.length} QR code{targetedQRIds.length === 1 ? "" : "s"}
                  </span>
                  {targetedFolderIds.length > 0 && (
                    <>
                      {" + "}
                      <span className="font-bold">{targetedFolderIds.length} folder{targetedFolderIds.length === 1 ? "" : "s"}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  disabled={deletingBulk}
                  onClick={() => setBulkDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={deletingBulk || !hasAnySelection}
                  onClick={handleBulkDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingBulk && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Delete folder modal ── */}
      {deleteFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500">folder_delete</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
              {tr.codes_delete_folder_title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
              {deleteFolderModal.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5">
              {tr.codes_delete_folder_subtitle}
            </p>
            <div className="flex flex-col gap-3">
              <button
                disabled={deletingFolder}
                onClick={() => handleDeleteFolder(deleteFolderModal, "move")}
                className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-slate-100">
                  <span className="material-symbols-outlined text-base text-primary">drive_file_move</span>
                  {tr.codes_delete_folder_move}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tr.codes_delete_folder_move_desc}
                </p>
              </button>
              <button
                disabled={deletingFolder}
                onClick={() => handleDeleteFolder(deleteFolderModal, "delete")}
                className="text-left px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 hover:border-red-500 hover:bg-red-50/60 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-base">delete_forever</span>
                  {tr.codes_delete_folder_purge}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tr.codes_delete_folder_purge_desc}
                </p>
              </button>
              <button
                disabled={deletingFolder}
                onClick={() => setDeleteFolderModal(null)}
                className="py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {tr.codes_delete_folder_cancel}
              </button>
            </div>
            {deletingFolder && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-3">
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500">delete</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors border border-slate-200 dark:border-[#242736]">{tr.delete_modal_cancel}</button>
              <button onClick={() => handleDelete(deleteModal)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">{tr.delete_modal_confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar folder node kept for reference but not used in new layout ─────────
function SidebarFolderNode({
  node,
  currentFolderId,
  onSelect,
  onToggle,
  togglingFolder,
  depth,
}: {
  node: FolderWithStats;
  currentFolderId: string | null;
  onSelect: (id: string) => void;
  onToggle?: (node: FolderWithStats, currentlyActive: boolean) => void;
  togglingFolder?: string | null;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = currentFolderId === node.id;
  const hasChildren = node.children.length > 0;

  // Determine if any contacts in this folder are active (we check via node.qrCount as proxy — just show toggle always)
  return (
    <div>
      <div
        className={`flex items-center gap-1 cursor-pointer transition-colors text-sm font-medium ${isActive ? "text-white" : "text-brand-text-secondary hover:bg-brand-surface-low hover:text-brand-text"}`}
        style={{ paddingLeft: `${depth * 12 + 16}px`, paddingRight: "8px", paddingTop: "8px", paddingBottom: "8px", ...(isActive ? { background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)", borderRadius: "0.75rem" } : {}) }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} className={`shrink-0 ${isActive ? "text-white/70" : "text-brand-outline"}`}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <span className="w-3.5 h-3.5 shrink-0" />}
        <FolderIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{node.name}</span>
        {onToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node, true); }}
            disabled={togglingFolder === node.id}
            title="Pause all QRs in this folder"
            className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100 hover:!opacity-100 disabled:opacity-30 ${isActive ? "text-white/70 hover:text-white" : "text-brand-outline hover:text-amber-500"}`}
          >
            <span className="material-symbols-outlined text-[14px]">pause_circle</span>
          </button>
        )}
      </div>
      {expanded && node.children.map((child) => (
        <SidebarFolderNode key={child.id} node={child} currentFolderId={currentFolderId} onSelect={onSelect} onToggle={onToggle} togglingFolder={togglingFolder} depth={depth + 1} />
      ))}
    </div>
  );
}
