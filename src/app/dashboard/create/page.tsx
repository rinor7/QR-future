"use client";

import { useRouter } from "next/navigation";
import QRForm from "@/components/QRForm";
import { createContact } from "@/lib/store";
import { CreateQRContact, PLAN_LABELS } from "@/lib/types";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import {
  getAllFolders, buildTree, createFolder, assignQrToFolder,
  type FolderWithStats,
} from "@/lib/folders";
import { getUserProfile } from "@/lib/store";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  FolderOpen, Folder as FolderIcon, ChevronRight, ChevronDown,
  Check, FolderPlus, X,
} from "lucide-react";

// ── Recursive tree node for picker ───────────────────────────────────────────
function FolderPickerNode({
  node, selected, onSelect, depth,
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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 ${!hasChildren ? "invisible" : ""}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {isSelected
          ? <FolderOpen className="w-4 h-4 shrink-0 text-blue-500" />
          : <FolderIcon className="w-4 h-4 shrink-0 text-blue-400" />}
        <span className={`flex-1 text-sm truncate ${isSelected ? "font-semibold text-blue-700" : "text-gray-700"}`}>{node.name}</span>
        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
      </div>
      {expanded && node.children.map((child) => (
        <FolderPickerNode key={child.id} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const { tr } = useLang();
  const { isReader, loading: roleLoading } = useRole();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Folder state
  const [folderTree, setFolderTree] = useState<FolderWithStats[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");

  // New folder inline creation
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderNameError, setFolderNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && isReader) router.replace("/dashboard/codes");
  }, [isReader, roleLoading, router]);

  useEffect(() => {
    getUserProfile().then((profile) => {
      if (!profile) return;
      setOrgId(profile.ownerId);
      setUserId(profile.userId);
      getAllFolders(profile.ownerId).then((folders) => {
        const tree = buildTree(folders);
        // Skip auto-created Root folder
        const display = tree.length === 1 && tree[0].name === "Root"
          ? tree[0].children
          : tree.filter((f) => f.name !== "Root");
        setFolderTree(display);
      }).catch(() => {});
    });
  }, []);

  async function handleCreateNewFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    // Duplicate check (top-level only since we create at root)
    if (folderTree.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setFolderNameError(`Ein Ordner namens "${name}" existiert bereits.`);
      return;
    }
    setSavingFolder(true);
    setFolderNameError(null);
    try {
      const newFolder = await createFolder(name, "custom", null, orgId, userId);
      await getSupabaseBrowser().rpc("grant_folder_role", {
        p_user_id: userId,
        p_folder_id: newFolder.id,
        p_role: "company_admin",
      });
      const updated = await getAllFolders(orgId);
      const tree = buildTree(updated);
      const display = tree.length === 1 && tree[0].name === "Root"
        ? tree[0].children
        : tree.filter((f) => f.name !== "Root");
      setFolderTree(display);
      setSelectedFolderId(newFolder.id);
      setNewFolderName("");
      setCreatingFolder(false);
    } finally {
      setSavingFolder(false);
    }
  }

  const selectedFolder = selectedFolderId
    ? (() => {
        function find(nodes: FolderWithStats[], id: string): FolderWithStats | null {
          for (const n of nodes) {
            if (n.id === id) return n;
            const f = find(n.children, id);
            if (f) return f;
          }
          return null;
        }
        return find(folderTree, selectedFolderId);
      })()
    : null;

  async function handleSubmit(data: CreateQRContact) {
    setError(null);
    setSubmitting(true);
    try {
      const contact = await createContact(data);
      // Assign folder if one was selected
      if (selectedFolderId) {
        await assignQrToFolder(contact.id, selectedFolderId);
      }
      router.push(`/dashboard/edit/${contact.id}?created=1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("PLAN_LIMIT:")) {
        const [, plan, limit] = msg.split(":");
        const planLabel = PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan;
        setError(`${tr.plan_limit_reached} ${planLabel} — ${limit} QR Codes. ${tr.plan_upgrade_hint}`);
      } else {
        setError(tr.create_error);
        console.error(e);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.create_title}</h1>
        <p className="text-gray-500 mt-1">{tr.create_subtitle}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{error}</div>
      )}

      {/* ── Folder picker ─────────────────────────────────────────── */}
      <div className="mb-8 max-w-2xl bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">In Ordner speichern</p>
            <p className="text-xs text-gray-400 mt-0.5">Optional — QR-Code direkt in einen Ordner legen.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedFolder && (
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Zurücksetzen
              </button>
            )}
            <button
              type="button"
              onClick={() => { setCreatingFolder((v) => !v); setFolderNameError(null); setNewFolderName(""); }}
              className="flex items-center gap-1.5 text-xs border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Neuer Ordner
            </button>
          </div>
        </div>

        {/* New folder inline form */}
        {creatingFolder && (
          <form onSubmit={handleCreateNewFolder} className="mb-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 border border-blue-200 rounded-xl px-3 py-2 bg-blue-50/40">
              <FolderPlus className="w-4 h-4 text-blue-500 shrink-0" />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => { setNewFolderName(e.target.value); setFolderNameError(null); }}
                placeholder="Ordner-Name"
                className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={savingFolder || !newFolderName.trim()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {savingFolder
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="w-3 h-3" />}
                Erstellen
              </button>
              <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName(""); setFolderNameError(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {folderNameError && <p className="text-xs text-red-600 px-1">{folderNameError}</p>}
          </form>
        )}

        {/* Selected folder display */}
        {selectedFolder ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-blue-700 flex-1">{selectedFolder.name}</span>
            <Check className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic mb-2">Kein Ordner ausgewählt</p>
        )}

        {/* Folder tree */}
        {folderTree.length > 0 && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
            {folderTree.map((f) => (
              <FolderPickerNode
                key={f.id}
                node={f}
                selected={selectedFolderId}
                onSelect={(id) => setSelectedFolderId((prev) => prev === id ? null : id)}
                depth={0}
              />
            ))}
          </div>
        )}

        {folderTree.length === 0 && !creatingFolder && (
          <p className="text-xs text-gray-400 mt-2">Noch keine Ordner vorhanden. Klicke auf &ldquo;Neuer Ordner&rdquo; um einen zu erstellen.</p>
        )}
      </div>

      <QRForm onSubmit={handleSubmit} submitLabel={tr.create_submit} loading={submitting} />
    </div>
  );
}
