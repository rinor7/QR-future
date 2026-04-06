"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, ExternalLink, Copy, Check, Download,
  BarChart2, FolderOpen, Folder as FolderIcon, ChevronRight,
  ArrowLeft, FolderPlus, X, ChevronDown,
} from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getAllFolders, buildTree, assignQrToFolder, createFolder, type FolderWithStats } from "@/lib/folders";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 ${!hasChildren ? "invisible" : ""}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <FolderIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-500" : "text-blue-400"}`} />
        <span className={`flex-1 text-sm truncate ${isSelected ? "font-semibold text-blue-700" : "text-gray-700"}`}>{node.name}</span>
        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
      </div>
      {expanded && node.children.map((child) => (
        <FolderPickerNode key={child.id} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">In Ordner verschieben</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{contactName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 max-h-64 overflow-y-auto">
          {/* No folder option */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selected === null ? "bg-blue-50" : "hover:bg-gray-50"}`}
            onClick={() => setSelected(null)}
          >
            <span className="w-4 h-4 shrink-0" />
            <X className="w-4 h-4 shrink-0 text-gray-400" />
            <span className={`flex-1 text-sm ${selected === null ? "font-semibold text-blue-700" : "text-gray-500"}`}>Kein Ordner</span>
            {selected === null && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
          </div>
          {folders.length > 0 && <div className="border-t border-gray-100 my-1.5" />}
          {folders.map((f) => (
            <FolderPickerNode key={f.id} node={f} selected={selected} onSelect={setSelected} depth={0} />
          ))}
        </div>

        <div className="px-4 pb-4 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CodesPage() {
  const { tr } = useLang();
  const { isAdmin, isReader } = useRole();
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

  const visibleFolders = currentFolderId
    ? (currentFolder?.children ?? [])
    : displayTree;

  function countInFolder(folderId: string): number {
    return Object.values(contactFolders).filter((v) => v === folderId).length;
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
      if (!matchesSearch || !matchesStatus) return false;
      if (search.trim()) return true;
      if (currentFolderId) return contactFolders[c.id] === currentFolderId;
      // Root level: show only QR codes not in any folder (or in a "Root" folder we're hiding)
      const fid = contactFolders[c.id];
      if (!fid) return true;
      // Also show cards assigned to the hidden Root folder
      const assignedFolder = findNode(folderTree, fid);
      if (assignedFolder && assignedFolder.name === "Root") return true;
      return false;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function getQRUrl(id: string) {
    return `${window.location.origin}/qr/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(getQRUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
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

  const limit = PLAN_LIMITS[plan];
  const limitReached = limit !== -1 && contacts.length >= limit;
  const hasFolders = displayTree.length > 0;
  const isDragging = !!dragContactId;
  // Max 3 levels: root (depth 0), child (depth 1), grandchild (depth 2)
  // breadcrumb.length equals current depth (0 = root view, 1 = inside level-1 folder, etc.)
  const canCreateFolder = breadcrumb.length < 3;

  const pickerContact = pickerContactId ? contacts.find((c) => c.id === pickerContactId) : null;

  return (
    <div className="p-4 wide:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-gray-500 mt-1">{contacts.length} {tr.codes_total}</p>
        </div>
        {!loading && !isReader && (
          limitReached ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-amber-800">{tr.plan_limit_reached} — </span>
              {isOwner ? (
                <Link href="/dashboard/upgrade" className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">{tr.free_plan_upgrade}</Link>
              ) : (
                <span className="text-sm text-amber-700">
                  {tr.plan_limit_ask_owner}{" "}
                  <Link href="/dashboard/upgrade" className="font-medium underline hover:text-amber-900 transition-colors">{tr.see_plans}</Link>.
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {canCreateFolder && (
                <button
                  onClick={() => { setCreatingFolder(true); setFolderNameError(null); setNewFolderName(""); }}
                  className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Neuer Ordner
                </button>
              )}
              <Link
                href="/dashboard/create"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                {tr.create_qr}
              </Link>
            </div>
          )
        )}
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 mb-5 text-sm">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            QR Codes
          </button>
          {breadcrumb.map((seg, i) => (
            <span key={seg.id} className="flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-gray-300" />
              {i === breadcrumb.length - 1 ? (
                <span className="font-semibold text-gray-900">{seg.name}</span>
              ) : (
                <button onClick={() => setCurrentFolderId(seg.id)} className="text-gray-500 hover:text-blue-600 transition-colors">{seg.name}</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder={tr.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
        <a
          href="/api/scan/export"
          download="scan-data.csv"
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {tr.export_csv}
        </a>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "paused")}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="all">{tr.filter_all}</option>
          <option value="active">{tr.filter_active}</option>
          <option value="paused">{tr.filter_paused}</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name")}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          <option value="newest">{tr.sort_newest}</option>
          <option value="oldest">{tr.sort_oldest}</option>
          <option value="name">{tr.sort_name}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* New folder form */}
          {creatingFolder && (
            <form onSubmit={handleCreateFolder} className="mb-5 bg-white border border-blue-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-500 shrink-0" />
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => { setNewFolderName(e.target.value); setFolderNameError(null); }}
                  placeholder={currentFolderId ? "Unterordner-Name" : "Ordner-Name"}
                  className="flex-1 text-sm focus:outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={savingFolder || !newFolderName.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  {savingFolder
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-3.5 h-3.5" />}
                  Erstellen
                </button>
                <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName(""); setFolderNameError(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {folderNameError && <p className="mt-2 text-xs text-red-600">{folderNameError}</p>}
            </form>
          )}

          {/* Folder cards */}
          {!search.trim() && visibleFolders.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ordner</p>
              <div className="flex flex-wrap gap-4">
                {visibleFolders.map((folder) => {
                  const isDragTarget = dragOverId === folder.id;
                  const qrCount = countInFolder(folder.id);
                  return (
                    <div
                      key={folder.id}
                      className="flex flex-col items-center cursor-pointer group select-none"
                      style={{ width: "110px" }}
                      onClick={() => !isDragging && setCurrentFolderId(folder.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(folder.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }}
                      onDrop={(e) => { e.preventDefault(); handleDropOnFolder(folder.id); }}
                    >
                      <div className={`w-full relative transition-all duration-150 ${isDragTarget ? "scale-110" : "group-hover:scale-105"}`} style={{ aspectRatio: "1.1" }}>
                        <div className={`absolute top-0 left-0 w-10 h-4 rounded-t-lg transition-colors ${isDragTarget ? "bg-blue-500" : "bg-blue-400 group-hover:bg-blue-500"}`} />
                        <div className={`absolute bottom-0 left-0 right-0 top-2 rounded-b-2xl rounded-tr-2xl flex items-center justify-center transition-colors shadow-sm ${isDragTarget ? "bg-blue-500 border-2 border-blue-300 border-dashed" : "bg-blue-400 group-hover:bg-blue-500"}`}>
                          {isDragTarget ? (
                            <span className="text-white text-xs font-semibold">Ablegen</span>
                          ) : (
                            <FolderOpen className="w-8 h-8 text-white/80" />
                          )}
                        </div>
                        {qrCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">{qrCount}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 text-center mt-2 truncate w-full px-1">{folder.name}</p>
                      <p className="text-xs text-gray-400 text-center">{qrCount} QR-Codes</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remove-from-folder drop zone (when dragging inside a folder) */}
          {currentFolder && isDragging && (
            <div
              className={`mb-5 border-2 border-dashed rounded-2xl p-4 text-center text-sm font-medium transition-colors ${dragOverId === "__remove__" ? "border-red-400 bg-red-50 text-red-500" : "border-gray-300 text-gray-400"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverId("__remove__"); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => { e.preventDefault(); handleDropOnRoot(); }}
            >
              Hierher ziehen um aus Ordner zu entfernen
            </div>
          )}

          {/* QR codes label */}
          {!search.trim() && hasFolders && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {currentFolder ? `QR-Codes in ${currentFolder.name}` : "Nicht zugeordnet"}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {currentFolder ? (
                <>
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-base font-medium">Ordner ist leer</p>
                  <p className="text-sm mt-1">QR-Code hinziehen oder über den Ordner-Button verschieben.</p>
                </>
              ) : (
                <p className="text-lg">{tr.no_results}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 wide:grid-cols-3 gap-5">
              {filtered.map((contact) => {
                const isBeingAssigned = assigningFolder === contact.id;
                const folderId = contactFolders[contact.id];
                const folderNode = folderId ? findNode(displayTree, folderId) : null;
                const folderName = folderNode?.name ?? null;

                return (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-2xl border p-6 flex flex-col gap-4 transition-all cursor-grab active:cursor-grabbing ${
                      dragContactId === contact.id ? "opacity-50 scale-95 shadow-xl" : "hover:shadow-md"
                    } ${contact.isActive === false ? "border-amber-200 opacity-75" : "border-gray-200"}`}
                  >
                    {isBeingAssigned && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 font-medium -mb-2">
                        <span className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Wird verschoben...
                      </div>
                    )}
                    {contact.isActive === false && (
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 w-fit">
                        ⏸ {tr.qr_paused_badge}
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {contact.qrLabel && <h3 className="font-semibold text-gray-900">{contact.qrLabel}</h3>}
                        <p className={contact.qrLabel ? "text-sm text-gray-700" : "font-semibold text-gray-900"}>
                          {`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}
                        </p>
                        {contact.company && <p className="text-sm text-gray-500">{contact.company}</p>}

                        {/* Folder badge — always shown if in a folder */}
                        {hasFolders && (
                          <button
                            onClick={() => setPickerContactId(contact.id)}
                            className={`mt-1.5 flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border transition-colors ${
                              folderName
                                ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                            }`}
                          >
                            <FolderIcon className="w-3 h-3 shrink-0" />
                            <span className="max-w-[120px] truncate">{folderName ?? "Ordner wählen"}</span>
                          </button>
                        )}
                      </div>
                      {contact.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={contact.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-lg shrink-0 ml-2" />
                      )}
                    </div>

                    <div id={`qr-${contact.id}`} className="flex justify-center py-2 mt-auto">
                      <QRCodeDisplay value={getQRUrl(contact.id)} size={140} logoUrl={contact.showLogoInQr ? contact.logoUrl : undefined} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono">{new Date(contact.createdAt).toLocaleDateString("de-DE")}</span>
                      <span className="flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5" />
                        {scanCounts[contact.id] ?? 0} {tr.scans_label}
                      </span>
                    </div>

                    {contact.createdBy && (
                      <p className="text-xs text-gray-400 -mt-2">{tr.created_by}: {contact.createdBy}</p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {!isReader && (
                        <Link
                          href={`/dashboard/edit/${contact.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {tr.edit}
                        </Link>
                      )}
                      <button onClick={() => handleCopy(contact.id)} className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                        {copiedId === contact.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a href={`/qr/${contact.id}`} target="_blank" className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => handleDownloadQR(contact.id, contact.logoUrl, contact.showLogoInQr)} className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => setDeleteModal(contact.id)} className="p-2 rounded-xl transition-colors border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Folder picker modal */}
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

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">{tr.delete_modal_cancel}</button>
              <button onClick={() => handleDelete(deleteModal)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">{tr.delete_modal_confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
