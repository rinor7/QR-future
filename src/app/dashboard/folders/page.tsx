"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "@/lib/folders";
import { getUserProfile } from "@/lib/store";

const FOLDER_TYPES: FolderType[] = [
  "company", "subsidiary", "location", "department", "team", "custom",
];

// ── Inline edit form ──────────────────────────────────────────────────────────
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
        {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
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

  // Flatten tree for selector, excluding the folder itself and its descendants
  function flatten(nodes: FolderWithStats[], depth = 0): { id: string; name: string; depth: number }[] {
    const result: { id: string; name: string; depth: number }[] = [];
    nodes.forEach((n) => {
      if (n.id === folder.id) return; // exclude self
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
          Neues übergeordnetes Verzeichnis für <strong>{folder.name}</strong> wählen:
        </p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="__root__">— Root (kein übergeordneter Ordner)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {"  ".repeat(o.depth)}{o.name}
            </option>
          ))}
        </select>
        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleMove}
            disabled={moving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {moving ? "Verschieben..." : "Verschieben"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folder node (recursive) ───────────────────────────────────────────────────
function FolderNode({
  node,
  allFolders,
  onRefresh,
  orgId,
  userId,
  depth,
}: {
  node: FolderWithStats;
  allFolders: FolderWithStats[];
  onRefresh: () => void;
  orgId: string;
  userId: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [addingChild, setAddingChild] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [movingFolder, setMovingFolder] = useState(false);

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
      setDeleteErr(e instanceof Error ? e.message : "Fehler beim Löschen");
      setDeleting(false);
    }
  }

  async function handleMove(folderId: string, newParentId: string | null) {
    await moveFolderRpc(folderId, newParentId);
    onRefresh();
  }

  const hasChildren = node.children.length > 0;
  const typeColor = FOLDER_TYPE_COLORS[node.type] ?? "bg-gray-100 text-gray-600";

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-blue-50/50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`w-5 h-5 flex items-center justify-center text-gray-400 shrink-0 ${!hasChildren && "invisible"}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        {expanded && hasChildren
          ? <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          : <FolderIcon className="w-4 h-4 text-blue-400 shrink-0" />}

        {/* Name / edit form */}
        {editing ? (
          <FolderForm
            initialName={node.name}
            initialType={node.type}
            onSave={handleEdit}
            onCancel={() => setEditing(false)}
            label="Speichern"
          />
        ) : (
          <>
            <span className="text-sm font-medium text-gray-900 flex-1 truncate">{node.name}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${typeColor} shrink-0`}>
              {FOLDER_TYPE_LABELS[node.type]}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <Users className="w-3 h-3" />{node.userCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <QrCode className="w-3 h-3" />{node.qrCount}
            </span>

            {/* Actions — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => { setAddingChild(true); setExpanded(true); }}
                title="Unterordner erstellen"
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditing(true)}
                title="Umbenennen"
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMovingFolder(true)}
                title="Verschieben"
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <MoveRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleting(true)}
                title="Löschen"
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add child form */}
      {addingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }} className="pb-1">
          <FolderForm
            onSave={handleCreate}
            onCancel={() => setAddingChild(false)}
            label="Erstellen"
          />
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900 text-center mb-2">Ordner löschen?</h2>
            <p className="text-sm text-gray-500 text-center mb-2">
              <strong>{node.name}</strong> wird unwiderruflich gelöscht.
            </p>
            {deleteErr && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 text-center">
                {deleteErr}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setDeleting(false); setDeleteErr(null); }}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move modal */}
      {movingFolder && (
        <MoveModal
          folder={node}
          allFolders={allFolders}
          onMove={handleMove}
          onClose={() => setMovingFolder(false)}
        />
      )}

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              allFolders={allFolders}
              onRefresh={onRefresh}
              orgId={orgId}
              userId={userId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FoldersPage() {
  const [tree, setTree] = useState<FolderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");
  const [addingRoot, setAddingRoot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) return;
      const oid = profile.ownerId;
      const uid = profile.userId;
      setOrgId(oid);
      setUserId(uid);

      const [folders, stats] = await Promise.all([
        getAllFolders(oid),
        getFolderStats(oid),
      ]);
      setTree(buildTree(folders, stats));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateRoot(name: string, type: FolderType) {
    await createFolder(name, type, null, orgId, userId);
    setAddingRoot(false);
    await load();
  }

  const totalFolders = tree.reduce(function countAll(acc: number, n: FolderWithStats): number {
    return acc + 1 + n.children.reduce(countAll, 0);
  }, 0);

  return (
    <div className="p-4 wide:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordner</h1>
          <p className="text-gray-500 mt-1">{totalFolders} Ordner insgesamt</p>
        </div>
        <button
          onClick={() => setAddingRoot(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <FolderPlus className="w-5 h-5" />
          Neuer Ordner
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* New root folder form */}
      {addingRoot && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Root-Ordner erstellen</p>
          <FolderForm
            onSave={handleCreateRoot}
            onCancel={() => setAddingRoot(false)}
            label="Erstellen"
          />
        </div>
      )}

      {/* Tree */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {/* Legend */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Nutzer</span>
          <span className="flex items-center gap-1"><QrCode className="w-3 h-3" /> QR-Codes</span>
          <span className="ml-auto">Hover für Aktionen</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tree.length === 0 && !addingRoot ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FolderIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium">Noch keine Ordner</p>
            <p className="text-sm mt-1">Erstellen Sie einen Ordner um zu beginnen.</p>
            <button
              onClick={() => setAddingRoot(true)}
              className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Ersten Ordner erstellen
            </button>
          </div>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <FolderNode
                key={node.id}
                node={node}
                allFolders={tree}
                onRefresh={load}
                orgId={orgId}
                userId={userId}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
