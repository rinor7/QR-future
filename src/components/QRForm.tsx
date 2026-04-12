"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Plus, Link2, X } from "lucide-react";
import { CreateQRContact, ContactLink } from "@/lib/types";
import { useLang } from "@/lib/language";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import QRStylePicker from "@/components/QRStylePicker";

const DEFAULTS: CreateQRContact = {
  qrLabel: "",
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  description: "",
  logoUrl: "",
  showLogoInQr: true,
  leadCaptureEnabled: false,
  phone: "",
  email: "",
  website: "",
  linkedinUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  snapchatUrl: "",
  xUrl: "",
  otherSocialUrl: "",
  links: [],
  country: "",
  street: "",
  streetNr: "",
  plz: "",
  city: "",
  primaryColor: "#2563eb",
  bgImageUrl: "",
  notes: "",
  isActive: true,
  theme: "classic",
  qrDotStyle: "square",
  qrCornerStyle: "square",
  qrDotColor: "#000000",
  qrBgColor: "#ffffff",
  qrGradient: false,
  qrGradientColor: "#2563eb",
};

const MAX_SIZE = 14 * 1024 * 1024; // 14 MB
const COMPRESS_THRESHOLD = 1 * 1024 * 1024; // 1 MB

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(
            new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.8
      );
    };
    img.src = url;
  });
}

async function uploadToStorage(
  folder: string,
  file: File,
  userId: string
): Promise<string> {
  const supabase = getSupabaseBrowser();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("Uploads")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("Uploads").getPublicUrl(path).data.publicUrl;
}

interface Props {
  initial?: Partial<CreateQRContact>;
  onSubmit: (data: CreateQRContact) => void;
  submitLabel: string;
  saved?: boolean;
  loading?: boolean;
  error?: string | null;
  supportEmail?: string;
  onFormChange?: (data: CreateQRContact) => void;
  hideActions?: boolean;
  formId?: string;
}

export default function QRForm({ initial, onSubmit, submitLabel, saved, loading, error, supportEmail, onFormChange, hideActions, formId }: Props) {
  const router = useRouter();
  const { tr } = useLang();
  const [form, setForm] = useState<CreateQRContact>({ ...DEFAULTS, ...initial });

  // Track which optional fields are manually opened
  const [openFields, setOpenFields] = useState<Set<string>>(() => {
    const open = new Set<string>();
    const optionals = ["title", "company", "description", "phone", "email", "website"];
    optionals.forEach((f) => {
      if ((initial as Record<string, string>)?.[f]) open.add(f);
    });
    return open;
  });
  const [activeSocial, setActiveSocial] = useState<string | null>(() => {
    const socials = ["linkedinUrl", "instagramUrl", "facebookUrl", "tiktokUrl", "snapchatUrl", "xUrl", "otherSocialUrl"];
    return socials.find((s) => (initial as Record<string, string>)?.[s]) ?? null;
  });

  function isFieldOpen(field: string) {
    return openFields.has(field) || !!(form[field as keyof CreateQRContact]);
  }
  function openField(field: string) {
    setOpenFields((prev) => { const next = new Set(prev); next.add(field); return next; });
  }

  // Templates
  const [templates, setTemplates] = useState<{ id: string; name: string; primary_color: string; theme: string; bg_image_url: string | null; show_logo_in_qr: boolean; lead_capture_enabled: boolean }[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setTemplates(data);
    }).catch(() => {});
  }, []);

  function applyTemplate(t: typeof templates[0]) {
    setForm((prev) => {
      const next = {
        ...prev,
        primaryColor: t.primary_color,
        theme: t.theme as CreateQRContact["theme"],
        bgImageUrl: t.bg_image_url ?? prev.bgImageUrl,
        showLogoInQr: t.show_logo_in_qr,
        leadCaptureEnabled: t.lead_capture_enabled,
      };
      onFormChange?.(next);
      return next;
    });
    setTemplateOpen(false);
  }

  async function saveTemplate() {
    if (!templateName.trim()) return;
    setTemplateSaving(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateName.trim(),
        primary_color: form.primaryColor,
        theme: form.theme,
        bg_image_url: form.bgImageUrl || null,
        show_logo_in_qr: form.showLogoInQr,
        lead_capture_enabled: form.leadCaptureEnabled,
      }),
    }).then((r) => r.json()).then((t) => {
      if (t.id) setTemplates((prev) => [t, ...prev]);
    });
    setTemplateName("");
    setShowSaveTemplate(false);
    setTemplateSaving(false);
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  const [userId, setUserId] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const [logoDragging, setLogoDragging] = useState(false);
  const [bgDragging, setBgDragging] = useState(false);
  const [addMode, setAddMode] = useState<null | "upload" | "link">(null);
  const [linkUploading, setLinkUploading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingLabel, setPendingLabel] = useState("");

  function setLinks(links: ContactLink[]) {
    setForm((prev) => ({ ...prev, links }));
  }

  function normalizeUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  }

  function confirmLink() {
    const url = normalizeUrl(pendingUrl.trim());
    if (!url) return;
    const label = pendingLabel.trim() || url;
    setLinks([...form.links, { url, label, type: "link" }]);
    setPendingUrl("");
    setPendingLabel("");
    setAddMode(null);
  }

  function removeLink(index: number) {
    setLinks(form.links.filter((_, i) => i !== index));
  }

  function updateLinkLabel(index: number, label: string) {
    setLinks(form.links.map((l, i) => (i === index ? { ...l, label } : l)));
  }

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
  }, []);

  function set(field: keyof CreateQRContact, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      onFormChange?.(next);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  async function processLogoFile(file: File) {
    setLogoError(null);
    if (file.size > MAX_SIZE) { setLogoError(tr.upload_error_size); return; }
    try {
      setLogoUploading(true);
      const toUpload = file.size > COMPRESS_THRESHOLD ? await compressImage(file) : file;
      const url = await uploadToStorage("logos", toUpload, userId);
      set("logoUrl", url);
    } catch { setLogoError(tr.upload_error_failed); }
    finally { setLogoUploading(false); }
  }

  async function processBgFile(file: File) {
    setBgError(null);
    if (file.size > MAX_SIZE) { setBgError(tr.upload_error_size); return; }
    try {
      setBgUploading(true);
      const toUpload = file.size > COMPRESS_THRESHOLD ? await compressImage(file) : file;
      const url = await uploadToStorage("logos", toUpload, userId);
      set("bgImageUrl", url);
    } catch { setBgError(tr.upload_error_failed); }
    finally { setBgUploading(false); }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) processLogoFile(file);
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault(); setLogoDragging(false);
    const file = e.dataTransfer.files?.[0]; if (file) processLogoFile(file);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) processBgFile(file);
  }

  function handleBgDrop(e: React.DragEvent) {
    e.preventDefault(); setBgDragging(false);
    const file = e.dataTransfer.files?.[0]; if (file) processBgFile(file);
  }

  async function handleLinkFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLinkError(null);
    if (file.size > MAX_SIZE) {
      setLinkError(tr.upload_error_size);
      return;
    }
    try {
      setLinkUploading(true);
      const url = await uploadToStorage("files", file, userId);
      const label = pendingLabel.trim() || file.name;
      setLinks([...form.links, { url, label, type: "file" }]);
      setPendingLabel("");
      setAddMode(null);
    } catch {
      setLinkError(tr.upload_error_failed);
    } finally {
      setLinkUploading(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-8 max-w-2xl">

      {/* Template picker bar */}
      {templates.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-purple-500 shrink-0">style</span>
          <span className="text-sm font-medium text-gray-600 dark:text-slate-300 shrink-0">Company Template:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors bg-gray-50 dark:bg-[#242736]"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.primary_color }} />
                  {t.name}
                </button>
                <button type="button" onClick={() => deleteTemplate(t.id)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSaveTemplate((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-purple-600 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Save current
          </button>
        </div>
      )}

      {/* Save template prompt */}
      {showSaveTemplate && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name…"
            className="flex-1 bg-white dark:bg-[#242736] border border-purple-200 dark:border-purple-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTemplate(); } }}
          />
          <button type="button" onClick={saveTemplate} disabled={!templateName.trim() || templateSaving} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {templateSaving ? "…" : "Save"}
          </button>
          <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* No templates yet — show save button */}
      {templates.length === 0 && !showSaveTemplate && (
        <button
          type="button"
          onClick={() => setShowSaveTemplate(true)}
          className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-purple-600 transition-colors px-3 py-2 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 w-fit"
        >
          <span className="material-symbols-outlined text-[14px]">style</span>
          Save as company template
        </button>
      )}

      {/* Basic Information */}
      <Section title="Basic Information" iconKey="basicinfo">
        <Field label={tr.qr_label}>
          <input
            type="text"
            value={form.qrLabel}
            onChange={(e) => set("qrLabel", e.target.value)}
            placeholder={tr.qr_label_placeholder}
            className={input}
          />
          <p className="text-xs text-gray-400 mt-1">{tr.qr_label_hint}</p>
        </Field>
      </Section>

      {/* Identity */}
      <Section title={tr.section_identity} iconKey="identity">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.field_first_name} required>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="Max"
              required
              className={input}
            />
          </Field>
          <Field label={tr.field_last_name}>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Mustermann"
              className={input}
            />
          </Field>
        </div>

        {/* Expandable: Title / Company / Description — closed buttons shown inline */}
        {(isFieldOpen("title") || isFieldOpen("company") || isFieldOpen("description")) ? (
          <>
            {isFieldOpen("title") ? (
              <Field label={tr.field_title}>
                <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="z.B. Geschäftsführer" className={input} autoFocus />
              </Field>
            ) : (
              <button type="button" onClick={() => openField("title")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_title}
              </button>
            )}
            {isFieldOpen("company") ? (
              <Field label={tr.field_company}>
                <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="z.B. Builtech Gruppe" className={input} />
              </Field>
            ) : (
              <button type="button" onClick={() => openField("company")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_company}
              </button>
            )}
            {isFieldOpen("description") ? (
              <Field label={tr.field_description}>
                <textarea value={(form as unknown as Record<string, string>).description ?? ""} onChange={(e) => set("description" as keyof CreateQRContact, e.target.value)} placeholder="Kurze Beschreibung oder Slogan…" rows={2} className={`${input} resize-none`} />
              </Field>
            ) : (
              <button type="button" onClick={() => openField("description")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_description}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openField("title")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {tr.field_title}
            </button>
            <button type="button" onClick={() => openField("company")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {tr.field_company}
            </button>
            <button type="button" onClick={() => openField("description")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-3 py-2 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {tr.field_description}
            </button>
          </div>
        )}

      </Section>

      {/* Design */}
      <Section title="Design" iconKey="design">
        <div className="space-y-5">

          {/* Background image */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.upload_bg}</p>
            {form.bgImageUrl ? (
              <div className="relative h-32 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.bgImageUrl} alt="BG" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <button type="button" onClick={() => set("bgImageUrl", "")} className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 text-xs px-2 py-1 rounded-lg transition-colors shadow-sm font-medium">{tr.upload_remove}</button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setBgDragging(true); }}
                onDragLeave={() => setBgDragging(false)}
                onDrop={handleBgDrop}
                className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-8 text-sm transition-colors ${
                  bgDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-[#242736] dark:border-slate-600"
                } ${bgUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-blue-600 font-medium text-sm">{bgUploading ? tr.upload_uploading : "Upload Image"}</span>
                <span className="text-gray-400 text-xs text-center">{tr.upload_bg_hint}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBgUpload} />
              </label>
            )}
            {bgError && <p className="text-xs text-red-500 mt-1">{bgError}</p>}
          </div>

          {/* Logo */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.field_logo}</p>
            {form.logoUrl ? (
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#242736] rounded-xl border border-gray-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Brand Identity</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, SVG or JPG (max 2MB)</p>
                </div>
                <button type="button" onClick={() => set("logoUrl", "")} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors">{tr.upload_remove}</button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={handleLogoDrop}
                className={`flex items-center gap-4 p-4 cursor-pointer border rounded-xl transition-colors ${logoDragging ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#242736] hover:bg-gray-100 dark:hover:bg-[#2a2d3e]"} ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="w-14 h-14 bg-gray-200 dark:bg-slate-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] text-gray-400">image</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Brand Identity</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, SVG or JPG (max 2MB)</p>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 hover:bg-white dark:hover:bg-[#1a1d27] transition-colors shrink-0">{logoUploading ? "..." : "Upload"}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
              </label>
            )}
            {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
          </div>

          {/* Accent color + Logo in QR toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.field_color}</p>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#242736] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-3">
                <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent shrink-0" />
                <span className="text-sm text-gray-600 dark:text-slate-300 font-mono">{form.primaryColor}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.qr_logo_in_center}</p>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#242736] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-3">
                <div
                  onClick={() => setForm((prev) => { const next = { ...prev, showLogoInQr: !prev.showLogoInQr }; onFormChange?.(next); return next; })}
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${form.showLogoInQr ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showLogoInQr ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">{form.showLogoInQr ? "On" : "Off"}</span>
              </div>
            </div>
          </div>

          {/* Lead Capture toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#242736] rounded-xl border border-gray-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-gray-700">Lead Capture</p>
              <p className="text-xs text-gray-400 mt-0.5">Show a &ldquo;Leave contact&rdquo; button on this profile</p>
            </div>
            <div
              onClick={() => setForm((prev) => { const next = { ...prev, leadCaptureEnabled: !prev.leadCaptureEnabled }; onFormChange?.(next); return next; })}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ml-3 ${form.leadCaptureEnabled ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.leadCaptureEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </div>

          {/* Theme picker */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{tr.field_theme}</p>
            <div className="grid grid-cols-3 gap-3">
              {(["classic", "dark", "minimal"] as const).map((t) => {
                const labels: Record<string, string> = { classic: tr.theme_classic, dark: tr.theme_dark, minimal: tr.theme_minimal };
                const cardBg: Record<string, string> = { classic: "#ffffff", dark: "#111827", minimal: "#f9fafb" };
                const headerBg: Record<string, string> = {
                  classic: form.primaryColor,
                  dark: "#374151",
                  minimal: "#e5e7eb",
                };
                const btnBg: Record<string, string> = {
                  classic: `${form.primaryColor}22`,
                  dark: "rgba(255,255,255,0.08)",
                  minimal: "#f3f4f6",
                };
                const selected = form.theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("theme", t)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    {/* Mini card preview */}
                    <div className="w-full h-14 rounded-lg overflow-hidden border border-gray-100" style={{ backgroundColor: cardBg[t] }}>
                      <div className="h-4 w-full" style={{ backgroundColor: headerBg[t] }} />
                      <div className="px-1.5 pt-1 space-y-1">
                        <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: headerBg[t], opacity: 0.3 }} />
                        <div className="h-2.5 w-full rounded" style={{ backgroundColor: btnBg[t] }} />
                        <div className="h-2.5 w-full rounded" style={{ backgroundColor: btnBg[t] }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{labels[t]}</span>
                    {selected && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* QR Code Design */}
      <Section title="QR Code Design" iconKey="qrdesign">
        <QRStylePicker
          value={{
            qrDotStyle: form.qrDotStyle,
            qrCornerStyle: form.qrCornerStyle,
            qrDotColor: form.qrDotColor,
            qrBgColor: form.qrBgColor,
            qrGradient: form.qrGradient,
            qrGradientColor: form.qrGradientColor,
          }}
          onChange={(v) => {
            const next = { ...form, ...v };
            setForm(next);
            onFormChange?.(next);
          }}
          logoUrl={form.showLogoInQr ? form.logoUrl : undefined}
          showLogo={form.showLogoInQr}
        />
      </Section>

      {/* Contact */}
      <Section
        title={tr.section_contact}
        iconKey="contact"
        actions={
          <>
            {!isFieldOpen("phone") && (
              <button type="button" onClick={() => openField("phone")} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 transition-colors bg-white dark:bg-[#1a1d27] dark:border-slate-700">
                <Plus className="w-3 h-3" /> {tr.field_phone}
              </button>
            )}
            {!isFieldOpen("email") && (
              <button type="button" onClick={() => openField("email")} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 transition-colors bg-white dark:bg-[#1a1d27] dark:border-slate-700">
                <Plus className="w-3 h-3" /> {tr.field_email}
              </button>
            )}
            {!isFieldOpen("website") && (
              <button type="button" onClick={() => openField("website")} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 transition-colors bg-white dark:bg-[#1a1d27] dark:border-slate-700">
                <Plus className="w-3 h-3" /> {tr.field_website}
              </button>
            )}
          </>
        }
      >
        {/* Open fields */}
        {isFieldOpen("phone") && (
          <Field label={tr.field_phone}>
            <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+41 123 456 789" className={input} autoFocus />
          </Field>
        )}
        {isFieldOpen("email") && (
          <Field label={tr.field_email}>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="max@qr-card.ch" className={input} />
          </Field>
        )}
        {isFieldOpen("website") && (
          <Field label={tr.field_website}>
            <input type="text" value={form.website} onChange={(e) => set("website", e.target.value)} onBlur={(e) => { if (e.target.value) set("website", normalizeUrl(e.target.value.trim())); }} placeholder="www.qr-card.ch" className={input} />
          </Field>
        )}
        <Field label="Land">
          <select
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            required
            className={`${input} cursor-pointer`}
          >
            <option value="">— Land wählen —</option>
            <option value="ch">Schweiz</option>
            <option value="de">Deutschland</option>
            <option value="at">Österreich</option>
            <option value="li">Liechtenstein</option>
            <option value="fr">Frankreich</option>
            <option value="lu">Luxemburg</option>
          </select>
        </Field>
        <div className={`grid grid-cols-2 gap-3 transition-opacity ${!form.country ? "opacity-40 pointer-events-none" : ""}`}>
          <Field label={tr.field_street}>
            <AddressAutocomplete
              value={form.street}
              onChange={(val) => set("street", val)}
              onSelect={(parts) => {
                const next = { ...form, ...parts };
                setForm(next);
                onFormChange?.(next);
              }}
              country={form.country}
              placeholder="Bahnhofstrasse"
              className={input}
            />
          </Field>
          <Field label={tr.field_street_nr}>
            <input
              type="text"
              value={form.streetNr}
              onChange={(e) => set("streetNr", e.target.value)}
              placeholder="12"
              className={input}
            />
          </Field>
          <Field label={tr.field_plz}>
            <input
              type="text"
              value={form.plz}
              onChange={(e) => set("plz", e.target.value)}
              placeholder="8001"
              className={input}
            />
          </Field>
          <Field label={tr.field_city}>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Zürich"
              className={input}
            />
          </Field>
        </div>
      </Section>

      {/* Social */}
      <Section title={tr.section_social} iconKey="social">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "linkedinUrl", label: "LinkedIn", prefix: "linkedin.com/in/", fullPrefix: "https://linkedin.com/in/" },
            { key: "instagramUrl", label: "Instagram", prefix: "instagram.com/", fullPrefix: "https://instagram.com/" },
            { key: "facebookUrl", label: "Facebook", prefix: "facebook.com/", fullPrefix: "https://facebook.com/" },
            { key: "tiktokUrl", label: "TikTok", prefix: "tiktok.com/@", fullPrefix: "https://tiktok.com/@" },
            { key: "snapchatUrl", label: "Snapchat", prefix: "snapchat.com/add/", fullPrefix: "https://snapchat.com/add/" },
            { key: "xUrl", label: "X / Twitter", prefix: "x.com/", fullPrefix: "https://x.com/" },
            { key: "otherSocialUrl", label: tr.field_other_social, prefix: null, fullPrefix: null },
          ] as { key: keyof CreateQRContact; label: string; prefix: string | null; fullPrefix: string | null }[]).map((s) => {
            const hasValue = !!(form[s.key] as string);
            const isActive = activeSocial === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSocial(isActive ? null : s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                  hasValue ? "bg-blue-50 border-blue-200 text-blue-700"
                  : isActive ? "bg-gray-100 border-gray-300 text-gray-700"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {hasValue
                  ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  : <Plus className="w-3.5 h-3.5 shrink-0" />}
                {s.label}
              </button>
            );
          })}
        </div>
        {activeSocial && (() => {
          const s = [
            { key: "linkedinUrl", prefix: "linkedin.com/in/", fullPrefix: "https://linkedin.com/in/" },
            { key: "instagramUrl", prefix: "instagram.com/", fullPrefix: "https://instagram.com/" },
            { key: "facebookUrl", prefix: "facebook.com/", fullPrefix: "https://facebook.com/" },
            { key: "tiktokUrl", prefix: "tiktok.com/@", fullPrefix: "https://tiktok.com/@" },
            { key: "snapchatUrl", prefix: "snapchat.com/add/", fullPrefix: "https://snapchat.com/add/" },
            { key: "xUrl", prefix: "x.com/", fullPrefix: "https://x.com/" },
          ].find((x) => x.key === activeSocial);
          return (
            <div className="mt-2">
              {s ? (
                <PrefixInput prefix={s.prefix} fullPrefix={s.fullPrefix} value={form[activeSocial as keyof CreateQRContact] as string} onChange={(v) => set(activeSocial as keyof CreateQRContact, v)} placeholder={tr.social_placeholder} />
              ) : (
                <input type="text" value={form[activeSocial as keyof CreateQRContact] as string} onChange={(e) => set(activeSocial as keyof CreateQRContact, e.target.value)} onBlur={(e) => { if (e.target.value) set(activeSocial as keyof CreateQRContact, normalizeUrl(e.target.value.trim())); }} placeholder="example.com" className={input} autoFocus />
              )}
            </div>
          );
        })()}
      </Section>

      {/* PDF / Links */}
      <Section title={tr.section_pdf} iconKey="pdf">
        <div className="space-y-3">
          {/* Existing links */}
          {form.links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50">
              {link.type === "file" ? (
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLinkLabel(i, e.target.value)}
                className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700 min-w-0"
              />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline shrink-0"
              >
                {tr.upload_pdf_open}
              </a>
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Add picker */}
          {form.links.length >= 4 ? (
            <p className="text-xs text-gray-400">{tr.links_max}</p>
          ) : addMode === null ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddMode("upload")}
                className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-400" />
                {tr.pdf_option_upload}
              </button>
              <button
                type="button"
                onClick={() => setAddMode("link")}
                className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-400" />
                {tr.pdf_option_link}
              </button>
            </div>
          ) : addMode === "upload" ? (
            <div className="space-y-2">
              <input
                type="text"
                value={pendingLabel}
                onChange={(e) => setPendingLabel(e.target.value)}
                placeholder={tr.link_label_placeholder}
                className={input}
              />
              <label
                className={`flex items-center gap-2 cursor-pointer border border-gray-200 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors w-full ${
                  linkUploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600">
                  {linkUploading ? tr.upload_uploading : tr.upload_pdf}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={handleLinkFileUpload}
                />
              </label>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400 flex-1">{tr.upload_pdf_hint}</p>
                <button
                  type="button"
                  onClick={() => { setAddMode(null); setPendingLabel(""); setLinkError(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {tr.cancel}
                </button>
              </div>
              {linkError && <p className="text-xs text-red-500">{linkError}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={pendingUrl}
                  onChange={(e) => setPendingUrl(e.target.value)}
                  placeholder="beispiel.at/broschüre"
                  className={`${input} pl-9`}
                  autoFocus
                />
              </div>
              <input
                type="text"
                value={pendingLabel}
                onChange={(e) => setPendingLabel(e.target.value)}
                placeholder={tr.link_label_placeholder}
                className={input}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmLink}
                  disabled={!pendingUrl.trim()}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  {tr.link_add}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMode(null); setPendingUrl(""); setPendingLabel(""); setLinkError(null); }}
                  className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {tr.cancel}
                </button>
              </div>
              {linkError && <p className="text-xs text-red-500">{linkError}</p>}
            </div>
          )}
        </div>
      </Section>

      {/* Notes */}
      <Section title={tr.section_notes} iconKey="notes">
        <Field label={tr.field_notes}>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={tr.field_notes_placeholder}
            rows={3}
            className={`${input} resize-none`}
          />
        </Field>
      </Section>

      {/* Actions */}
      {!hideActions && <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!!loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? "Wird gespeichert..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {tr.cancel}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {tr.saved}
          </span>
        )}
      </div>}
      {!hideActions && error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}{" "}
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="underline font-medium hover:text-red-800">
              {tr.contact_support}
            </a>
          )}
        </div>
      )}
    </form>
  );
}

const SECTION_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  default:        { icon: "article",          bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
  identity:       { icon: "badge",            bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
  design:         { icon: "palette",          bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-500 dark:text-orange-400" },
  qrdesign:       { icon: "qr_code_2",        bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  contact:        { icon: "contact_page",     bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
  social:         { icon: "share",            bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
  pdf:            { icon: "description",      bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
  notes:          { icon: "format_list_bulleted", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  basicinfo:      { icon: "sell",             bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400" },
};

function Section({
  title,
  iconKey,
  actions,
  children,
}: {
  title: string;
  iconKey?: keyof typeof SECTION_ICONS;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ic = SECTION_ICONS[iconKey ?? "default"];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ic.bg}`}>
            <span className={`material-symbols-outlined text-[20px] ${ic.text}`}>{ic.icon}</span>
          </div>
          <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-100 uppercase">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const input =
  "w-full bg-gray-50 dark:bg-[#242736] border border-gray-200 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500";

function PrefixInput({
  prefix,
  fullPrefix,
  value,
  onChange,
  placeholder,
}: {
  prefix: string;
  fullPrefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  // Extract just the handle/slug from the stored full URL
  function getSuffix(full: string): string {
    if (!full) return "";
    if (full.startsWith(fullPrefix)) return full.slice(fullPrefix.length);
    // Fallback for old manually-entered values
    const variants = [fullPrefix, fullPrefix.replace("https://", "http://"), fullPrefix.replace("https://", "")];
    for (const v of variants) {
      if (full.startsWith(v)) return full.slice(v.length);
    }
    return full;
  }

  return (
    <div className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      <span className="flex items-center text-xs text-gray-400 bg-gray-50 px-3 border-r border-gray-200 whitespace-nowrap shrink-0 select-none">
        {prefix}
      </span>
      <input
        type="text"
        value={getSuffix(value)}
        onChange={(e) => onChange(e.target.value ? fullPrefix + e.target.value.trim() : "")}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white placeholder:text-gray-400"
      />
    </div>
  );
}
