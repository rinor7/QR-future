"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  QrCode,
  Check,
  X,
  MoveRight,
  ExternalLink,
  FolderInput,
} from "lucide-react";
import {
  getAllFolders,
  getFolderStats,
  createFolder,
  updateFolder,
  deleteFolderRpc,
  moveFolderRpc,
  buildTree,
  FolderWithStats,
  FolderType,
  FOLDER_TYPE_LABELS,
  FOLDER_TYPE_COLORS,
  assignQrToFolder,
} from "@/lib/folders";
import { getUserProfile } from "@/lib/store";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import QRCodeDisplay from "@/components/QRCodeDisplay";

const FOLDER_TYPES: FolderType[] = [
  "company", "subsidiary", "location", "department", "team", "custom",
];

// ── Inline folder form ────────────────────────────────────────────────────────
function FolderForm({
  initialName = "",
  initialType = "custom" as FolderType,
  onSave,
  onCancel,
  label,
}: {
  initialName?: string;
  initialType?: FolderType;
  onSave: (name: string, type: FolderType) => Promise<void>;
  onCancel: () => void;
  label: string;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<FolderType>(initialType);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(name.trim(), type);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 mt-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ordnername"
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as FolderType)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {FOLDER_TYPES.map((t) => (
          <option key={t} value={t}>{FOLDER_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Check className="w-3.5 h-3.5" />}
        {label}
      </button>
      <button type="button" onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
        <X className="w-4 h-4" />
      </button>
      {err && <p className="w-full text-xs text-red-600">{err}</p>}
    </form>
  );
}

// ── Move modal ────────────────────────────────────────────────────────────────
function MoveModal({
  folder,
  allFolders,
  onMove,
  onClose,
}: {
  folder: FolderWithStats;
  allFolders: FolderWithStats[];
  onMove: (folderId: string, newParentId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string>("__root__");
  const [moving, setMoving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function flatten(nodes: FolderWithStats[], depth = 0): { id: string; name: string; depth: number }[] {
    const result: { id: string; name: string; depth: number }[] = [];
    nodes.forEach((n) => {
      if (n.id === folder.id) return;
      result.push({ id: n.id, name: n.name, depth });
      result.push(...flatten(n.children, depth + 1));
    });
    return result;
  }

  const options = flatten(allFolders);

  async function handleMove() {
    setMoving(true);
    setErr(null);
    try {
      await onMove(folder.id, selected === "__root__" ? null : selected);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Fehler");
      setMoving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Ordner verschieben</h2>
        <p className="text-sm text-gray-500 mb-4">
          Neues Verzeichnis für <strong>{folder.name}</strong>:
        </p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="__root__">— Root (kein übergeordneter Ordner)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{"  ".repeat(o.depth)}{o.name}</option>
          ))}
        </select>
        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button onClick={handleMove} disabled={moving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            {moving ? "Verschieben..." : "Verschieben"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folder tree node ──────────────────────────────────────────────────────────
function FolderNode({
  node,
  allFolders,
  selectedId,
  onSelect,
  onRefresh,
  orgId,
  userId,
  depth,
  isRoot,
}: {
  node: FolderWithStats;
  allFolders: FolderWithStats[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  orgId: string;
  userId: string;
  depth: number;
  isRoot?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [addingChild, setAddingChild] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [movingFolder, setMovingFolder] = useState(false);

  const isSelected = selectedId === node.id;

  async function handleCreate(name: string, type: FolderType) {
    await createFolder(name, type, node.id, orgId, userId);
    setAddingChild(false);
    setExpanded(true);
    onRefresh();
  }

  async function handleEdit(name: string, type: FolderType) {
    await updateFolder(node.id, name, type);
    setEditing(false);
    onRefresh();
  }

  async function handleDelete() {
    setDeleteErr(null);
    try {
      await deleteFolderRpc(node.id);
      onRefresh();
    } catch (e: unknown) {
      setDeleteErr(e instanceof Error ? e.message : "Fehler");
      setDeleting(false);
    }
  }

  async function handleMove(folderId: string, newParentId: string | null) {
    await moveFolderRpc(folderId, newParentId);
    onRefresh();
  }

  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-colors ${
          isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50/60"
        }`}
        style={{ paddingLeft: `${depth * 18 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-5 h-5 flex items-center justify-center shrink-0 ${!hasChildren ? "invisible" : isSelected ? "text-white/70" : "text-gray-400"}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        {expanded && hasChildren
          ? <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-blue-500"}`} />
          : <FolderIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-blue-400"}`} />}

        {/* Name / edit */}
        {editing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <FolderForm initialName={node.name} initialType={node.type} onSave={handleEdit} onCancel={() => setEditing(false)} label="Speichern" />
          </div>
        ) : (
          <>
            <span className={`text-sm font-medium flex-1 truncate ${isSelected ? "text-white" : "text-gray-900"}`}>{node.name}</span>

            {/* Stats */}
            <span className={`flex items-center gap-1 text-xs shrink-0 ${isSelected ? "text-white/70" : "text-gray-400"}`}>
              <QrCode className="w-3 h-3" />{node.qrCount}
            </span>
            <span className={`flex items-center gap-1 text-xs shrink-0 ${isSelected ? "text-white/70" : "text-gray-400"}`}>
              <Users className="w-3 h-3" />{node.userCount}
            </span>

            {/* Hover actions */}
            <div
              className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isSelected ? "opacity-100" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { setAddingChild(true); setExpanded(true); }} title="Unterordner" className={`p-1 rounded-lg transition-colors ${isSelected ? "hover:bg-white/20 text-white/80" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}>
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditing(true)} title="Umbenennen" className={`p-1 rounded-lg transition-colors ${isSelected ? "hover:bg-white/20 text-white/80" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {!isRoot && (
                <button onClick={() => setMovingFolder(true)} title="Verschieben" className={`p-1 rounded-lg transition-colors ${isSelected ? "hover:bg-white/20 text-white/80" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}>
                  <MoveRight className="w-3.5 h-3.5" />
                </button>
              )}
              {!isRoot && (
                <button onClick={() => setDeleting(true)} title="Löschen" className={`p-1 rounded-lg transition-colors ${isSelected ? "hover:bg-red-200 text-white/80" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add child form */}
      {addingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }} className="pb-1">
          <FolderForm onSave={handleCreate} onCancel={() => setAddingChild(false)} label="Erstellen" />
        </div>
      )}

      {/* Delete modal */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900 text-center mb-2">Ordner löschen?</h2>
            <p className="text-sm text-gray-500 text-center mb-2"><strong>{node.name}</strong> wird unwiderruflich gelöscht.</p>
            {deleteErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 text-center">{deleteErr}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setDeleting(false); setDeleteErr(null); }} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Abbrechen</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Ja, löschen</button>
            </div>
          </div>
        </div>
      )}

      {movingFolder && (
        <MoveModal folder={node} allFolders={allFolders} onMove={handleMove} onClose={() => setMovingFolder(false)} />
      )}

      {/* Children */}
      {expanded && node.children.map((child) => (
        <FolderNode key={child.id} node={child} allFolders={allFolders} selectedId={selectedId} onSelect={onSelect} onRefresh={onRefresh} orgId={orgId} userId={userId} depth={depth + 1} isRoot={false} />
      ))}
    </div>
  );
}

// ── QR code row in folder panel ───────────────────────────────────────────────
function FolderQRItem({
  contact,
  baseUrl,
  allFolders,
  currentFolderId,
  onMoved,
}: {
  contact: { id: string; name: string; company: string; logo_url: string };
  baseUrl: string;
  allFolders: FolderWithStats[];
  currentFolderId: string;
  onMoved: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const [showMove, setShowMove] = useState(false);

  function flatten(nodes: FolderWithStats[]): { id: string; name: string }[] {
    return nodes.flatMap((n) => [{ id: n.id, name: n.name }, ...flatten(n.children)]);
  }
  const otherFolders = flatten(allFolders).filter((f) => f.id !== currentFolderId);

  async function handleMove(targetId: string) {
    setMoving(true);
    try {
      if (targetId === "__none__") {
        const supabase = getSupabaseBrowser();
        await supabase.from("contacts").update({ folder_id: null }).eq("id", contact.id);
      } else {
        await assignQrToFolder(contact.id, targetId);
      }
      onMoved();
    } finally {
      setMoving(false);
      setShowMove(false);
    }
  }

  const qrUrl = `${baseUrl}/qr/${contact.id}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group transition-colors">
      <div className="w-10 h-10 shrink-0">
        <QRCodeDisplay value={qrUrl} size={40} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{contact.name || "(kein Name)"}</p>
        {contact.company && <p className="text-xs text-gray-400 truncate">{contact.company}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link href={`/dashboard/edit/${contact.id}`} title="Bearbeiten" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <a href={qrUrl} target="_blank" title="Öffnen" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <div className="relative">
          <button
            onClick={() => setShowMove((v) => !v)}
            title="In Ordner verschieben"
            disabled={moving}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>
          {showMove && (
            <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
              <button onClick={() => handleMove("__none__")} className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                Aus Ordner entfernen
              </button>
              {otherFolders.length > 0 && <div className="border-t border-gray-100 my-1" />}
              {otherFolders.map((f) => (
                <button key={f.id} onClick={() => handleMove(f.id)} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors truncate">
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FoldersPage() {
  const [tree, setTree] = useState<FolderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // QR codes for the selected folder
  const [folderContacts, setFolderContacts] = useState<{ id: string; name: string; company: string; logo_url: string }[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) return;
      const oid = profile.ownerId;
      const uid = profile.userId;
      setOrgId(oid);
      setUserId(uid);
      const [folders, stats] = await Promise.all([getAllFolders(oid), getFolderStats(oid)]);
      setTree(buildTree(folders, stats));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load QR codes when a folder is selected
  useEffect(() => {
    if (!selectedId) { setFolderContacts([]); return; }
    setLoadingContacts(true);
    getSupabaseBrowser()
      .from("contacts")
      .select("id, name, company, logo_url")
      .eq("folder_id", selectedId)
      .order("name")
      .then(({ data }) => {
        setFolderContacts((data ?? []) as { id: string; name: string; company: string; logo_url: string }[]);
      })
      .then(() => setLoadingContacts(false), () => setLoadingContacts(false));
  }, [selectedId]);

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function findNode(nodes: FolderWithStats[], id: string): FolderWithStats | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const selectedFolder = selectedId ? findNode(tree, selectedId) : null;

  const totalFolders = tree.reduce(function countAll(acc: number, n: FolderWithStats): number {
    return acc + 1 + n.children.reduce(countAll, 0);
  }, 0);

  return (
    <div className="p-4 wide:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordner</h1>
          <p className="text-gray-500 mt-1">{totalFolders} Ordner insgesamt</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {/* Split layout */}
      <div className="flex gap-5 items-start">
        {/* Left: tree */}
        <div className="bg-white rounded-2xl border border-gray-200 flex-shrink-0 w-full max-w-xs">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Struktur</span>
            <span className="text-xs text-gray-400">Klicken zum Öffnen</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 px-4 text-center">
              <FolderIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Noch keine Ordner</p>
              <p className="text-xs mt-1">Ordner werden automatisch erstellt.</p>
            </div>
          ) : (
            <div className="p-2">
              {tree.map((node) => (
                <FolderNode
                  key={node.id}
                  node={node}
                  allFolders={tree}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onRefresh={load}
                  orgId={orgId}
                  userId={userId}
                  depth={0}
                  isRoot={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: folder content */}
        <div className="flex-1 min-w-0">
          {!selectedFolder ? (
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
              <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Ordner auswählen</p>
              <p className="text-xs mt-1">Klicken Sie links auf einen Ordner um dessen Inhalt zu sehen.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200">
              {/* Folder header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900 truncate">{selectedFolder.name}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${FOLDER_TYPE_COLORS[selectedFolder.type]}`}>
                      {FOLDER_TYPE_LABELS[selectedFolder.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <QrCode className="w-3 h-3" /> {selectedFolder.qrCount} QR-Codes
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" /> {selectedFolder.userCount} Nutzer
                    </span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/codes?folder=${selectedId}`}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium shrink-0"
                >
                  Alle QR-Codes <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* QR codes list */}
              <div className="p-3">
                {loadingContacts ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : folderContacts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Keine QR-Codes in diesem Ordner</p>
                    <Link href="/dashboard/codes" className="mt-2 inline-block text-xs text-blue-600 hover:underline font-medium">
                      QR-Codes zuweisen
                    </Link>
                  </div>
                ) : (
                  <div>
                    {folderContacts.map((c) => (
                      <FolderQRItem
                        key={c.id}
                        contact={c}
                        baseUrl={baseUrl}
                        allFolders={tree}
                        currentFolderId={selectedId!}
                        onMoved={() => {
                          load();
                          // Reload contacts for this folder
                          setFolderContacts((prev) => prev.filter((x) => x.id !== c.id));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
