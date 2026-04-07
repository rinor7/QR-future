"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, Folder as FolderIcon, ChevronRight,
  X, ChevronDown,
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

  // Pagination
  const [page, setPage] = useState(1);
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

  // Reset to page 1 whenever the view changes
  useEffect(() => { setPage(1); }, [currentFolderId, search, statusFilter, sortBy]);

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
    <div className="pt-6 pb-12 px-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-headline text-[3.5rem] font-bold leading-none tracking-tighter mb-2">QR Codes</h1>
          <p className="text-on-surface-variant font-medium">Manage and monitor your enterprise QR infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/scan/export" download="scan-data.csv" className="flex items-center gap-2 bg-surface-container-high px-5 py-3 rounded-xl font-headline font-semibold text-primary hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined">file_download</span>
            CSV export
          </a>
          {!isReader && !limitReached && (
            <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 px-6 py-3 font-headline font-bold shadow-lg">
              <span className="material-symbols-outlined">add_circle</span>
              {tr.create_qr}
            </Link>
          )}
          {limitReached && isOwner && (
            <Link href="/dashboard/upgrade" className="btn-primary flex items-center gap-2 px-6 py-3 font-headline font-bold shadow-lg">
              Upgrade Plan →
            </Link>
          )}
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 mb-8 text-sm">
          <button onClick={() => setCurrentFolderId(null)} className="flex items-center gap-1.5 text-outline hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            QR Codes
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
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            type="text"
            placeholder={tr.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "paused")} className="bg-surface-container-low border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary text-on-surface-variant">
          <option value="all">{tr.filter_all}</option>
          <option value="active">{tr.filter_active}</option>
          <option value="paused">{tr.filter_paused}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name")} className="bg-surface-container-low border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary text-on-surface-variant">
          <option value="newest">{tr.sort_newest}</option>
          <option value="oldest">{tr.sort_oldest}</option>
          <option value="name">{tr.sort_name}</option>
        </select>
        {canCreateFolder && (
          <button onClick={() => { setCreatingFolder(true); setFolderNameError(null); setNewFolderName(""); }} className="flex items-center gap-2 bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-base">create_new_folder</span>
            Neuer Ordner
          </button>
        )}
      </div>

      {/* ── New folder form ── */}
      {creatingFolder && (
        <form onSubmit={handleCreateFolder} className="mb-8 bg-surface-container-lowest rounded-xl px-5 py-4 shadow-sm border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">create_new_folder</span>
            <input autoFocus value={newFolderName} onChange={(e) => { setNewFolderName(e.target.value); setFolderNameError(null); }}
              placeholder={currentFolderId ? "Unterordner-Name" : "Ordner-Name"}
              className="flex-1 text-sm focus:outline-none bg-transparent text-on-surface" />
            <button type="submit" disabled={savingFolder || !newFolderName.trim()} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-50">
              {savingFolder ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-sm">check</span>}
              Erstellen
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
                <h3 className="font-headline text-xs font-extrabold uppercase tracking-widest text-outline">ORDNER</h3>
                <button className="text-primary text-sm font-semibold hover:underline">View all folders</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleFolders.map((folder) => {
                  const isDragTarget = dragOverId === folder.id;
                  const qrCount = countInFolder(folder.id);
                  return (
                    <div
                      key={folder.id}
                      className={`bg-surface-container-low p-6 rounded-xl flex items-center justify-between group hover:bg-surface-container-high transition-all cursor-pointer ${isDragTarget ? "ring-2 ring-primary" : ""}`}
                      onClick={() => !isDragging && setCurrentFolderId(folder.id)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(folder.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }}
                      onDrop={(e) => { e.preventDefault(); handleDropOnFolder(folder.id); }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                        </div>
                        <div>
                          <h4 className="font-headline font-bold text-slate-900">{folder.name}</h4>
                          <p className="text-xs font-medium text-outline">{qrCount} Assets</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
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
              Hierher ziehen um aus Ordner zu entfernen
            </div>
          )}

          {/* ── QR Codes grid ── */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline text-xs font-extrabold uppercase tracking-widest text-outline">
                {currentFolder ? `QR-CODES IN ${currentFolder.name.toUpperCase()}` : "RECENT QR CODES"}
              </h3>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">grid_view</span>
                </button>
                <button className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center text-outline hover:bg-surface-container-high transition-colors">
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
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {paginated.map((contact) => {
                  const folderId = contactFolders[contact.id];
                  const folderNode = folderId ? findNode(displayTree, folderId) : null;
                  const folderName = folderNode?.name ?? null;
                  return (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-surface-container-lowest rounded-xl flex flex-col md:flex-row overflow-hidden group border border-outline-variant/10 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[0px_20px_40px_rgba(25,28,30,0.08)] ${dragContactId === contact.id ? "opacity-50" : ""}`}
                    >
                      {/* Left content (2/3) */}
                      <div className="p-8 md:w-2/3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">Business Card</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${contact.isActive !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {contact.isActive !== false ? "Active" : "Paused"}
                            </span>
                          </div>
                          <h4 className="text-2xl font-headline font-bold text-slate-900 mb-1">
                            {`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}
                          </h4>
                          {contact.title && <p className="text-primary font-semibold text-sm mb-1">{contact.title}</p>}
                          {contact.company && <p className="text-outline text-sm mb-6">{contact.company}</p>}
                          <div className="flex items-center gap-6 mt-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase text-outline tracking-wider">Created</span>
                              <span className="text-sm font-semibold">{new Date(contact.createdAt).toLocaleDateString("de-DE")}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase text-outline tracking-wider">Scans</span>
                              <span className="text-sm font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">trending_up</span>
                                {scanCounts[contact.id] ?? 0} Scans
                              </span>
                            </div>
                            {hasFolders && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase text-outline tracking-wider">Folder</span>
                                <button onClick={() => setPickerContactId(contact.id)} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">folder</span>
                                  {folderName ?? "None"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-8">
                          {!isReader && (
                            <Link href={`/dashboard/edit/${contact.id}`} className="flex-1 bg-surface-container-low hover:bg-surface-container-high text-primary py-2.5 rounded-lg text-sm font-bold font-headline transition-colors text-center">
                              Bearbeiten
                            </Link>
                          )}
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/qr/${contact.id}`); setCopiedId(contact.id); setTimeout(() => setCopiedId(null), 2000); }} className="w-10 h-10 bg-surface-container-low flex items-center justify-center text-outline rounded-lg hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-base">{copiedId === contact.id ? "check" : "content_copy"}</span>
                          </button>
                          <a href={`/qr/${contact.id}`} target="_blank" className="w-10 h-10 bg-surface-container-low flex items-center justify-center text-outline rounded-lg hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-base">share</span>
                          </a>
                          <button onClick={() => handleDownloadQR(contact.id, contact.logoUrl, contact.showLogoInQr)} className="w-10 h-10 bg-surface-container-low flex items-center justify-center text-outline rounded-lg hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteModal(contact.id)} className="w-10 h-10 bg-surface-container-low flex items-center justify-center text-error/60 rounded-lg hover:bg-error-container hover:text-error transition-colors">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right QR panel */}
                      <div className="w-[140px] shrink-0 bg-slate-50 flex items-center justify-center p-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div id={`qr-${contact.id}`} className="relative z-10 p-2 bg-white rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300">
                          <QRCodeDisplay value={`${typeof window !== "undefined" ? window.location.origin : ""}/qr/${contact.id}`} size={96} logoUrl={contact.showLogoInQr ? contact.logoUrl : undefined} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* New QR Code dashed card */}
                {!isReader && !limitReached && (
                  <Link href="/dashboard/create" className="bg-surface-container border-2 border-dashed border-outline-variant/50 rounded-xl flex flex-col items-center justify-center p-8 text-center group hover:border-primary/50 transition-colors cursor-pointer min-h-[320px]">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <span className="material-symbols-outlined text-3xl">add</span>
                    </div>
                    <h4 className="font-headline font-bold text-slate-900 mb-2">New QR Code</h4>
                    <p className="text-sm text-outline max-w-[200px]">Create a new digital business card or redirect link.</p>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid rgba(195,197,217,0.3)" }}>
              <p className="text-sm text-on-surface-variant font-medium">
                Showing <span className="font-bold text-on-surface">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-on-surface">{filtered.length}</span> QR codes
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-5 py-2.5 bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-colors disabled:opacity-40 shadow-sm">
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

      {/* ── Delete modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.12)] max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-error-container/30 rounded-full mx-auto mb-4">
              <span className="material-symbols-outlined text-error">delete</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-on-surface text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-outline text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 text-on-surface-variant py-2.5 rounded-xl font-medium text-sm hover:bg-surface-container-low transition-colors border border-outline-variant/30">{tr.delete_modal_cancel}</button>
              <button onClick={() => handleDelete(deleteModal)} className="flex-1 bg-error hover:opacity-90 text-white py-2.5 rounded-xl font-medium text-sm transition-opacity">{tr.delete_modal_confirm}</button>
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
  depth,
}: {
  node: FolderWithStats;
  currentFolderId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = currentFolderId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 cursor-pointer transition-colors text-sm font-medium ${isActive ? "text-white" : "text-brand-text-secondary hover:bg-brand-surface-low hover:text-brand-text"}`}
        style={{ paddingLeft: `${depth * 12 + 16}px`, paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", ...(isActive ? { background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)", borderRadius: "0.75rem" } : {}) }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} className={`shrink-0 ${isActive ? "text-white/70" : "text-brand-outline"}`}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <span className="w-3.5 h-3.5 shrink-0" />}
        <FolderIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{node.name}</span>
      </div>
      {expanded && node.children.map((child) => (
        <SidebarFolderNode key={child.id} node={child} currentFolderId={currentFolderId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}
