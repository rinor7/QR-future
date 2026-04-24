"use client";

import { useRouter } from "next/navigation";
import QRForm from "@/components/QRForm";
import { createContact } from "@/lib/store";
import { CreateQRContact, PLAN_LABELS } from "@/lib/types";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/language";
import {
  getAllFolders, buildTree, assignQrToFolder,
  type FolderWithStats,
} from "@/lib/folders";
import { getUserProfile } from "@/lib/store";
import {
  FolderOpen, Folder as FolderIcon, ChevronRight, ChevronDown,
  Check, X,
} from "lucide-react";
import PhonePreview from "@/components/PhonePreview";

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateQRContact>>({
    primaryColor: "#2563eb",
    theme: "classic",
    showLogoInQr: true,
  });

  // Folder state
  const [folderTree, setFolderTree] = useState<FolderWithStats[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  const [orgDefaults, setOrgDefaults] = useState<{ company?: string; logoUrl?: string }>({});
  const [supportEmail, setSupportEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/platform/support-email").then((r) => r.json()).then(({ supportEmail: s }) => { if (s) setSupportEmail(s); }).catch(() => {});
    getUserProfile().then(async (profile) => {
      if (!profile) return;
      // Load folders
      getAllFolders(profile.ownerId).then((folders) => {
        const tree = buildTree(folders);
        const display = tree.length === 1 && tree[0].name === "Root"
          ? tree[0].children
          : tree.filter((f) => f.name !== "Root");
        setFolderTree(display);
      }).catch(() => {});
      // Load org defaults to pre-fill company + logo
      const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowser();
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_name, brand_logo_url")
        .eq("user_id", profile.ownerId)
        .single();
      if (prof) {
        setOrgDefaults({
          company: prof.organization_name ?? undefined,
          logoUrl: prof.brand_logo_url ?? undefined,
        });
      }
    });
  }, []);

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
        setError(msg ? `${tr.create_error} (${msg})` : tr.create_error);
        console.error(e);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Trigger form submit
  function triggerSubmit() {
    const form = document.getElementById("qr-create-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#eef1f8] dark:bg-[#0f1117]">
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#131620] border-b border-slate-200 dark:border-[#1e2130] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <button type="button" onClick={() => router.push("/dashboard/codes")} className="text-xs text-slate-400 hover:text-blue-600 transition-colors">QR Codes</button>
              <span className="material-symbols-outlined text-[12px] text-slate-300">chevron_right</span>
              <span className="text-xs text-blue-600 font-medium">New Dynamic Code</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Configuration &amp; Details</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={triggerSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            {submitting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            )}
            {submitting ? "Generating..." : "Finish & Generate"}
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="w-full flex gap-6 p-4 sm:p-6 wide:p-8 max-w-7xl mx-auto items-start min-w-0">
        {/* ── Left: form ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Basic Information */}
          <div>
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] border-l-4 border-l-blue-500 p-6 space-y-4">
              {/* QR Name field is inside QRForm as the first field, so we need the folder picker here */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Destination Folder <span className="text-slate-400 font-normal">(optional)</span></label>
                <button
                  type="button"
                  onClick={() => setFolderOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-slate-50 dark:bg-[#242736] hover:bg-white dark:hover:bg-[#1e2130] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">folder</span>
                    <span className={`truncate ${selectedFolder ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-400 dark:text-slate-500"}`}>
                      {selectedFolder ? selectedFolder.name : "No folder selected"}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                    {folderOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {folderOpen && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-white dark:bg-[#1a1d27]">
                    {folderTree.length > 0 ? (
                      <>
                        {folderTree.map((f) => (
                          <FolderPickerNode
                            key={f.id}
                            node={f}
                            selected={selectedFolderId}
                            onSelect={(id) => {
                              setSelectedFolderId((prev) => prev === id ? null : id);
                              setFolderOpen(false);
                            }}
                            depth={0}
                          />
                        ))}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 px-4 py-3">No folders yet. Create folders on the QR Codes page.</p>
                    )}
                  </div>
                )}

                {selectedFolder && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear folder selection
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QRForm handles all other sections */}
          <QRForm
            formId="qr-create-form"
            onSubmit={handleSubmit}
            submitLabel="Finish & Generate"
            loading={submitting}
            hideActions
            supportEmail={supportEmail}
            onFormChange={(data) => setFormData(data)}
            initial={orgDefaults}
          />

          {/* ── Bottom action bar ─────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] px-6 py-5">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={triggerSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-60 shadow-lg"
                style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
              >
                {submitting ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                )}
                {submitting ? "Generating your QR Code..." : "Finish & Generate QR Code"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Your QR Code will be saved and you&apos;ll be taken to the edit page where you can download or share it.
            </p>
          </div>
        </div>

        {/* ── Right: live preview ─────────────────────────────────────────── */}
        <div className="hidden lg:block w-[340px] shrink-0 self-start">
        <div className="sticky top-[68px] flex flex-col gap-4">

          {/* Phone preview card */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#242736]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matrix Pro Rendering</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">Live Preview</span>
            </div>
            {/* Phone */}
            <div className="py-6 flex justify-center">
              <PhonePreview form={formData} />
            </div>
            {/* Type + Tracking rows */}
            <div className="border-t border-slate-100 dark:border-[#242736]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#242736]">
                <span className="text-xs text-slate-500">Type</span>
                <span className="text-xs font-semibold text-blue-600">vCard (Dynamic)</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-slate-500">Tracking</span>
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1.5">
                  Enabled
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                </span>
              </div>
            </div>
          </div>

          {/* QR Code preview card */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">QR Code Preview</p>
            <div className="flex justify-center">
              <div className="w-36 h-36 rounded-xl bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-col gap-2">
                <span className="material-symbols-outlined text-[52px] text-slate-300">qr_code_2</span>
                <p className="text-xs text-slate-400 text-center leading-tight px-2">Generated after saving</p>
              </div>
            </div>
            {formData.primaryColor && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: formData.primaryColor }} />
                <span className="text-xs text-slate-500 font-mono">{formData.primaryColor}</span>
              </div>
            )}
          </div>

          {/* Pro Tip card */}
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[18px]">tips_and_updates</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Matrix Pro Tip</p>
                <p className="text-xs text-blue-100 leading-relaxed">Dynamic codes allow you to edit all contact info anytime without changing the physical QR image.</p>
              </div>
            </div>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
}
