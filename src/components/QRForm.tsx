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
  phones: [],
  email: "",
  emails: [],
  website: "",
  websites: [],
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
    const optionals = ["title", "company", "description"];
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
  type QRTemplate = {
    id: string; name: string; primary_color: string; theme: string;
    bg_image_url: string | null; show_logo_in_qr: boolean; lead_capture_enabled: boolean;
    company: string | null; logo_url: string | null; website: string | null; description: string | null;
    phones: string | null; emails: string | null; websites: string | null;
    linkedin_url: string | null; instagram_url: string | null; facebook_url: string | null;
    tiktok_url: string | null; snapchat_url: string | null; x_url: string | null; other_social_url: string | null;
    qr_dot_style: string | null; qr_corner_style: string | null; qr_dot_color: string | null;
    qr_bg_color: string | null; qr_gradient: boolean; qr_gradient_color: string | null;
    locked_fields: string[];
  };
  const [templates, setTemplates] = useState<QRTemplate[]>([]);
  const [appliedTemplate, setAppliedTemplate] = useState<{ id: string; name: string; locked: Set<string> } | null>(null);

  function isLocked(dbKey: string): boolean {
    return !!appliedTemplate?.locked.has(dbKey);
  }
  const lockedCls = "opacity-50 cursor-not-allowed";

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setTemplates(data);
    }).catch(() => {});
  }, []);

  function applyTemplate(t: QRTemplate) {
    const locked = new Set(t.locked_fields ?? []);
    setAppliedTemplate({ id: t.id, name: t.name, locked });
    // Force-open expandable fields that are locked so they show as disabled
    if (locked.has("company") || locked.has("description")) {
      setOpenFields((prev) => {
        const next = new Set(prev);
        if (locked.has("company")) next.add("company");
        if (locked.has("description")) next.add("description");
        return next;
      });
    }
    const parseArr = <T,>(s: string | null): T[] => {
      if (!s) return [];
      try { const v = typeof s === "string" ? JSON.parse(s) : s; return Array.isArray(v) ? v : []; } catch { return []; }
    };
    const tplPhones = parseArr<{ number: string; label: string }>(t.phones);
    const tplEmails = parseArr<{ email: string; label: string }>(t.emails);
    const tplWebsites = parseArr<{ url: string; label: string }>(t.websites);

    setForm((prev) => {
      const next: CreateQRContact = {
        ...prev,
        primaryColor: t.primary_color,
        theme: t.theme as CreateQRContact["theme"],
        bgImageUrl: t.bg_image_url ?? prev.bgImageUrl,
        showLogoInQr: t.show_logo_in_qr,
        leadCaptureEnabled: t.lead_capture_enabled,
        ...(t.company && { company: t.company }),
        ...(t.logo_url && { logoUrl: t.logo_url }),
        ...(t.website && { website: t.website }),
        ...(t.description && { description: t.description }),
        ...(tplPhones.length > 0 && { phones: tplPhones }),
        ...(tplEmails.length > 0 && { emails: tplEmails }),
        ...(tplWebsites.length > 0 && { websites: tplWebsites }),
        ...(t.linkedin_url && { linkedinUrl: t.linkedin_url }),
        ...(t.instagram_url && { instagramUrl: t.instagram_url }),
        ...(t.facebook_url && { facebookUrl: t.facebook_url }),
        ...(t.tiktok_url && { tiktokUrl: t.tiktok_url }),
        ...(t.snapchat_url && { snapchatUrl: t.snapchat_url }),
        ...(t.x_url && { xUrl: t.x_url }),
        ...(t.other_social_url && { otherSocialUrl: t.other_social_url }),
        ...(t.qr_dot_style && { qrDotStyle: t.qr_dot_style as CreateQRContact["qrDotStyle"] }),
        ...(t.qr_corner_style && { qrCornerStyle: t.qr_corner_style as CreateQRContact["qrCornerStyle"] }),
        ...(t.qr_dot_color && { qrDotColor: t.qr_dot_color }),
        ...(t.qr_bg_color && { qrBgColor: t.qr_bg_color }),
        qrGradient: t.qr_gradient ?? prev.qrGradient,
        ...(t.qr_gradient_color && { qrGradientColor: t.qr_gradient_color }),
      };
      onFormChange?.(next);
      return next;
    });
    // Open website field if locked
    if (locked.has("website")) {
      setOpenFields((prev) => { const next = new Set(prev); next.add("website"); return next; });
    }
  }

  function removeTemplate() {
    setAppliedTemplate(null);
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
    <form id={formId} onSubmit={handleSubmit} className="space-y-8 min-w-0">

      {/* Template picker bar */}
      <div className="p-5 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-[#1a1d27] rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-sm min-w-0">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] text-purple-600">style</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Start from a Template</h3>
              {appliedTemplate && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Applied
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {appliedTemplate
                ? `"${appliedTemplate.name}" is pre-filling this card. Click it again to remove.`
                : templates.length === 0
                ? "No templates yet — create one to pre-fill and lock fields for your team."
                : "Click a template below to pre-fill fields. Locked fields can't be edited after applying."}
            </p>
          </div>
          <a
            href="/dashboard/settings"
            target="_blank"
            className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            {templates.length === 0 ? "Create" : "Manage"}
          </a>
        </div>

        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2 min-w-0">
            {templates.map((t) => {
              const isActive = appliedTemplate?.id === t.id;
              const lockedCount = (t.locked_fields ?? []).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => isActive ? removeTemplate() : applyTemplate(t)}
                  className={`group flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border-2 transition-all ${isActive ? "border-purple-500 bg-white dark:bg-purple-900/20 text-purple-700 dark:text-purple-200 shadow-sm" : "border-gray-200 dark:border-slate-700 bg-white dark:bg-[#242736] text-gray-700 dark:text-slate-300 hover:border-purple-300 hover:shadow-sm"}`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: t.primary_color }} />
                  <span className="truncate max-w-[140px]">{t.name}</span>
                  {lockedCount > 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40" : "bg-orange-50 text-orange-600 dark:bg-orange-900/20"}`}>
                      <span className="material-symbols-outlined text-[10px]">lock</span>
                      {lockedCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] text-purple-500 ml-0.5">close</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
              <button type="button" onClick={() => openField("title")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_title}
              </button>
            )}
            {isFieldOpen("company") ? (
              <Field label={tr.field_company}>
                <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="z.B. Builtech Gruppe" disabled={isLocked("company")} className={`${input} ${isLocked("company") ? lockedCls : ""}`} />
              </Field>
            ) : (
              <button type="button" onClick={() => openField("company")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_company}
              </button>
            )}
            {isFieldOpen("description") ? (
              <Field label={tr.field_description}>
                <textarea value={(form as unknown as Record<string, string>).description ?? ""} onChange={(e) => set("description" as keyof CreateQRContact, e.target.value)} placeholder="Kurze Beschreibung oder Slogan…" rows={2} disabled={isLocked("description")} className={`${input} resize-none ${isLocked("description") ? lockedCls : ""}`} />
              </Field>
            ) : (
              <button type="button" onClick={() => openField("description")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors w-fit">
                <Plus className="w-3.5 h-3.5" /> {tr.field_description}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openField("title")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {tr.field_title}
            </button>
            <button type="button" onClick={() => openField("company")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> {tr.field_company}
            </button>
            <button type="button" onClick={() => openField("description")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-300 rounded-full px-4 py-1.5 transition-colors">
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
              <div
                onDragOver={(e) => { e.preventDefault(); setBgDragging(true); }}
                onDragLeave={() => setBgDragging(false)}
                onDrop={handleBgDrop}
                className={`relative h-32 rounded-xl overflow-hidden border ${bgDragging ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.bgImageUrl} alt="BG" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <button type="button" onClick={() => set("bgImageUrl", "")} className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 text-xs px-2 py-1 rounded-lg transition-colors shadow-sm font-medium">{tr.upload_remove}</button>
                {bgDragging && <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center text-xs font-semibold text-blue-700">Drop to replace</div>}
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
          <div className={isLocked("logo_url") ? "pointer-events-none opacity-60 relative" : ""}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.field_logo}</p>
            {form.logoUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={handleLogoDrop}
                className={`relative flex items-center gap-4 p-4 rounded-xl border ${logoDragging ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#242736]"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Brand Identity</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, SVG or JPG (max 2MB)</p>
                </div>
                <button type="button" onClick={() => set("logoUrl", "")} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors">{tr.upload_remove}</button>
                {logoDragging && <div className="absolute inset-0 rounded-xl bg-blue-500/10 flex items-center justify-center text-xs font-semibold text-blue-700 pointer-events-none">Drop to replace</div>}
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={handleLogoDrop}
                className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-8 text-sm transition-colors ${
                  logoDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-[#242736] dark:border-slate-600"
                } ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-blue-600 font-medium text-sm">{logoUploading ? tr.upload_uploading : "Upload Logo"}</span>
                <span className="text-gray-400 text-xs text-center">PNG, SVG or JPG (max 2MB)</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
              </label>
            )}
            {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
          </div>

          {/* Accent color + Logo in QR toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.field_color}</p>
              <div className={`flex items-center bg-gray-50 dark:bg-[#242736] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden ${isLocked("primary_color") ? "opacity-60 pointer-events-none" : ""}`}>
                <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} disabled={isLocked("primary_color")} className="w-11 h-11 cursor-pointer border-0 bg-transparent shrink-0 p-1" />
                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 shrink-0" />
                <span className="text-sm text-gray-600 dark:text-slate-300 font-mono px-3">{form.primaryColor}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tr.qr_logo_in_center}</p>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#242736] border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-3">
                <div
                  onClick={isLocked("show_logo_in_qr") ? undefined : () => setForm((prev) => { const next = { ...prev, showLogoInQr: !prev.showLogoInQr }; onFormChange?.(next); return next; })}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.showLogoInQr ? "bg-blue-600" : "bg-gray-200"} ${isLocked("show_logo_in_qr") ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showLogoInQr ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">{form.showLogoInQr ? "On" : "Off"}</span>
              </div>
            </div>
          </div>

          {/* Lead Capture toggle */}
          <div
            onClick={isLocked("lead_capture_enabled") ? undefined : () => setForm((prev) => { const next = { ...prev, leadCaptureEnabled: !prev.leadCaptureEnabled }; onFormChange?.(next); return next; })}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              form.leadCaptureEnabled
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 shadow-sm"
                : "bg-white dark:bg-[#242736] border-gray-200 dark:border-slate-700 hover:border-blue-300"
            } ${isLocked("lead_capture_enabled") ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form.leadCaptureEnabled ? "bg-blue-600 text-white" : "bg-blue-100 dark:bg-blue-900/40 text-blue-600"}`}>
                <span className="material-symbols-outlined text-[20px]">contact_mail</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Lead Capture</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Show a &ldquo;Leave contact&rdquo; button on this profile</p>
              </div>
            </div>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${form.leadCaptureEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-600"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.leadCaptureEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </div>
          </div>

          {/* Theme picker */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{tr.field_theme}</p>
            <div className={`grid grid-cols-3 gap-3 ${isLocked("theme") ? "pointer-events-none opacity-60" : ""}`}>
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
      <Section title="QR Code Design" iconKey="qrdesign" collapsible defaultOpen={false}>
        <div className={["qr_dot_style","qr_corner_style","qr_dot_color","qr_bg_color","qr_gradient","qr_gradient_color"].some(f => isLocked(f)) ? "pointer-events-none opacity-60" : ""}>
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
        </div>
      </Section>

      {/* Phone Numbers */}
      <Section title={tr.field_phone} iconKey="contact">
        <p className="text-xs text-gray-400 dark:text-slate-500 -mt-2 mb-1">You can add up to 4 phone numbers. Optionally set a display name for each button (e.g. &quot;Mobile&quot;, &quot;Office&quot;).</p>
        <div className={`space-y-3 ${isLocked("phone") ? "pointer-events-none opacity-60" : ""}`}>
          {(form.phones.length === 0 ? [{ number: "", label: "" }] : form.phones).map((ph, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="tel"
                  value={ph.number}
                  onChange={(e) => {
                    const next = [...(form.phones.length === 0 ? [{ number: "", label: "" }] : form.phones)];
                    next[idx] = { ...next[idx], number: e.target.value };
                    setForm((prev) => { const n = { ...prev, phones: next }; onFormChange?.(n); return n; });
                  }}
                  placeholder="+41 123 456 789"
                  disabled={isLocked("phone")}
                  className={`${input} ${isLocked("phone") ? lockedCls : ""}`}
                />
              </div>
              <div className="w-40 shrink-0">
                <input
                  type="text"
                  value={ph.label}
                  onChange={(e) => {
                    const next = [...(form.phones.length === 0 ? [{ number: "", label: "" }] : form.phones)];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setForm((prev) => { const n = { ...prev, phones: next }; onFormChange?.(n); return n; });
                  }}
                  placeholder="Button name"
                  disabled={isLocked("phone")}
                  className={`${input} text-xs ${isLocked("phone") ? lockedCls : ""}`}
                />
              </div>
              {idx > 0 ? (
                <button
                  type="button"
                  onClick={() => { const next = form.phones.filter((_, i) => i !== idx); setForm((prev) => { const n = { ...prev, phones: next }; onFormChange?.(n); return n; }); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 shrink-0" aria-hidden="true" />
              )}
            </div>
          ))}
          {(form.phones.length === 0 ? 1 : form.phones.length) < 4 && !isLocked("phone") && (
            <button
              type="button"
              onClick={() => { const next = [...(form.phones.length === 0 ? [{ number: "", label: "" }] : form.phones), { number: "", label: "" }]; setForm((prev) => { const n = { ...prev, phones: next }; onFormChange?.(n); return n; }); }}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another number
            </button>
          )}
        </div>
      </Section>

      {/* Email Addresses */}
      <Section title={tr.field_email} iconKey="contact">
        <p className="text-xs text-gray-400 dark:text-slate-500 -mt-2 mb-1">You can add up to 3 email addresses. Optionally set a display name (e.g. &quot;Work&quot;, &quot;Personal&quot;).</p>
        <div className={`space-y-3 ${isLocked("email") ? "pointer-events-none opacity-60" : ""}`}>
          {(form.emails.length === 0 ? [{ email: "", label: "" }] : form.emails).map((em, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="email"
                  value={em.email}
                  onChange={(e) => {
                    const next = [...(form.emails.length === 0 ? [{ email: "", label: "" }] : form.emails)];
                    next[idx] = { ...next[idx], email: e.target.value };
                    setForm((prev) => { const n = { ...prev, emails: next }; onFormChange?.(n); return n; });
                  }}
                  placeholder="max@example.com"
                  disabled={isLocked("email")}
                  className={`${input} ${isLocked("email") ? lockedCls : ""}`}
                />
              </div>
              <div className="w-40 shrink-0">
                <input
                  type="text"
                  value={em.label}
                  onChange={(e) => {
                    const next = [...(form.emails.length === 0 ? [{ email: "", label: "" }] : form.emails)];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setForm((prev) => { const n = { ...prev, emails: next }; onFormChange?.(n); return n; });
                  }}
                  placeholder="Button name"
                  disabled={isLocked("email")}
                  className={`${input} text-xs ${isLocked("email") ? lockedCls : ""}`}
                />
              </div>
              {idx > 0 ? (
                <button
                  type="button"
                  onClick={() => { const next = form.emails.filter((_, i) => i !== idx); setForm((prev) => { const n = { ...prev, emails: next }; onFormChange?.(n); return n; }); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 shrink-0" aria-hidden="true" />
              )}
            </div>
          ))}
          {(form.emails.length === 0 ? 1 : form.emails.length) < 3 && !isLocked("email") && (
            <button
              type="button"
              onClick={() => { const next = [...(form.emails.length === 0 ? [{ email: "", label: "" }] : form.emails), { email: "", label: "" }]; setForm((prev) => { const n = { ...prev, emails: next }; onFormChange?.(n); return n; }); }}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another email
            </button>
          )}
        </div>
      </Section>

      {/* Websites */}
      <Section title={tr.field_website} iconKey="contact">
        <p className="text-xs text-gray-400 dark:text-slate-500 -mt-2 mb-1">You can add up to 3 websites. Optionally set a display name (e.g. &quot;Portfolio&quot;, &quot;LinkedIn&quot;).</p>
        <div className={`space-y-3 ${isLocked("website") ? "pointer-events-none opacity-60" : ""}`}>
          {(form.websites.length === 0 ? [{ url: "", label: "" }] : form.websites).map((ws, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={ws.url}
                  onChange={(e) => {
                    const next = [...(form.websites.length === 0 ? [{ url: "", label: "" }] : form.websites)];
                    next[idx] = { ...next[idx], url: e.target.value };
                    setForm((prev) => { const n = { ...prev, websites: next }; onFormChange?.(n); return n; });
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      const next = [...(form.websites.length === 0 ? [{ url: "", label: "" }] : form.websites)];
                      next[idx] = { ...next[idx], url: normalizeUrl(e.target.value.trim()) };
                      setForm((prev) => { const n = { ...prev, websites: next }; onFormChange?.(n); return n; });
                    }
                  }}
                  placeholder="www.example.com"
                  disabled={isLocked("website")}
                  className={`${input} ${isLocked("website") ? lockedCls : ""}`}
                />
              </div>
              {ws.url ? (
                <div className="w-40 shrink-0">
                  <input
                    type="text"
                    value={ws.label}
                    onChange={(e) => {
                      const next = [...(form.websites.length === 0 ? [{ url: "", label: "" }] : form.websites)];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setForm((prev) => { const n = { ...prev, websites: next }; onFormChange?.(n); return n; });
                    }}
                    placeholder="Button name"
                    disabled={isLocked("website")}
                    className={`${input} text-xs ${isLocked("website") ? lockedCls : ""}`}
                  />
                </div>
              ) : (
                <div className="w-40 shrink-0" aria-hidden="true" />
              )}
              {idx > 0 ? (
                <button
                  type="button"
                  onClick={() => { const next = form.websites.filter((_, i) => i !== idx); setForm((prev) => { const n = { ...prev, websites: next }; onFormChange?.(n); return n; }); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 shrink-0" aria-hidden="true" />
              )}
            </div>
          ))}
          {(form.websites.length === 0 ? 1 : form.websites.length) < 3 && !isLocked("website") && (
            <button
              type="button"
              onClick={() => { const next = [...(form.websites.length === 0 ? [{ url: "", label: "" }] : form.websites), { url: "", label: "" }]; setForm((prev) => { const n = { ...prev, websites: next }; onFormChange?.(n); return n; }); }}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another website
            </button>
          )}
        </div>
      </Section>

      {/* Contact */}
      <Section title={tr.section_contact} iconKey="contact">
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
      <Section title={tr.section_social} iconKey="social" collapsible defaultOpen={false}>
        {(() => {
          const SOCIAL_DB_KEY: Record<string, string> = {
            linkedinUrl: "linkedin_url", instagramUrl: "instagram_url", facebookUrl: "facebook_url",
            tiktokUrl: "tiktok_url", snapchatUrl: "snapchat_url", xUrl: "x_url", otherSocialUrl: "other_social_url",
          };
          return (
            <>
              <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
                {([
                  { key: "linkedinUrl", label: "LinkedIn", prefix: "linkedin.com/in/", fullPrefix: "https://linkedin.com/in/" },
                  { key: "instagramUrl", label: "Instagram", prefix: "instagram.com/", fullPrefix: "https://instagram.com/" },
                  { key: "facebookUrl", label: "Facebook", prefix: "facebook.com/", fullPrefix: "https://facebook.com/" },
                  { key: "tiktokUrl", label: "TikTok", prefix: "tiktok.com/@", fullPrefix: "https://tiktok.com/@" },
                  { key: "snapchatUrl", label: "Snapchat", prefix: "snapchat.com/add/", fullPrefix: "https://snapchat.com/add/" },
                  { key: "xUrl", label: "X / Twitter", prefix: "x.com/", fullPrefix: "https://x.com/" },
                  { key: "otherSocialUrl", label: tr.field_other_social, prefix: null, fullPrefix: null },
                ] as { key: keyof CreateQRContact; label: string; prefix: string | null; fullPrefix: string | null }[]).map((s) => {
                  const value = (form[s.key] as string) || "";
                  const hasValue = !!value;
                  const isActive = activeSocial === s.key;
                  const fieldLocked = isLocked(SOCIAL_DB_KEY[s.key]);
                  const handleText = s.fullPrefix && value.startsWith(s.fullPrefix) ? value.slice(s.fullPrefix.length) : value.replace(/^https?:\/\//, "");
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => !fieldLocked && setActiveSocial(isActive ? null : s.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                        fieldLocked ? (hasValue ? "cursor-not-allowed bg-orange-50 border-orange-300 text-orange-700" : "opacity-60 cursor-not-allowed bg-orange-50 border-orange-200 text-orange-600")
                        : hasValue ? "bg-blue-50 border-blue-200 text-blue-700"
                        : isActive ? "bg-gray-100 border-gray-300 text-gray-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {fieldLocked
                        ? <span className="material-symbols-outlined text-[12px]">lock</span>
                        : hasValue
                        ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        : <Plus className="w-3.5 h-3.5 shrink-0" />}
                      <span>{s.label}</span>
                      {fieldLocked && hasValue && (
                        <span className="text-xs font-normal text-orange-600/80 border-l border-orange-200 pl-1.5 ml-0.5 max-w-[140px] truncate">
                          {handleText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {activeSocial && (() => {
                const fieldLocked = isLocked(SOCIAL_DB_KEY[activeSocial]);
                const s = [
                  { key: "linkedinUrl", prefix: "linkedin.com/in/", fullPrefix: "https://linkedin.com/in/" },
                  { key: "instagramUrl", prefix: "instagram.com/", fullPrefix: "https://instagram.com/" },
                  { key: "facebookUrl", prefix: "facebook.com/", fullPrefix: "https://facebook.com/" },
                  { key: "tiktokUrl", prefix: "tiktok.com/@", fullPrefix: "https://tiktok.com/@" },
                  { key: "snapchatUrl", prefix: "snapchat.com/add/", fullPrefix: "https://snapchat.com/add/" },
                  { key: "xUrl", prefix: "x.com/", fullPrefix: "https://x.com/" },
                ].find((x) => x.key === activeSocial);
                return (
                  <div className={`mt-2 ${fieldLocked ? "pointer-events-none opacity-60" : ""}`}>
                    {s ? (
                      <PrefixInput prefix={s.prefix} fullPrefix={s.fullPrefix} value={form[activeSocial as keyof CreateQRContact] as string} onChange={(v) => set(activeSocial as keyof CreateQRContact, v)} placeholder={tr.social_placeholder} />
                    ) : (
                      <input type="text" value={form[activeSocial as keyof CreateQRContact] as string} onChange={(e) => set(activeSocial as keyof CreateQRContact, e.target.value)} onBlur={(e) => { if (e.target.value) set(activeSocial as keyof CreateQRContact, normalizeUrl(e.target.value.trim())); }} placeholder="example.com" className={input} autoFocus />
                    )}
                  </div>
                );
              })()}
            </>
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
      <Section title={tr.section_notes} iconKey="notes" collapsible defaultOpen={false}>
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
  design:         { icon: "palette",          bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
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
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  iconKey?: keyof typeof SECTION_ICONS;
  actions?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const ic = SECTION_ICONS[iconKey ?? "default"];
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm overflow-hidden min-w-0">
      <div
        className={`flex items-center justify-between px-6 py-4 ${open ? "border-b border-gray-100 dark:border-[#242736]" : ""} ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ic.bg}`}>
            <span className={`material-symbols-outlined text-[18px] ${ic.text}`}>{ic.icon}</span>
          </div>
          <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 uppercase">{title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {actions}
          {collapsible && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <span className="material-symbols-outlined text-[20px]">{open ? "expand_less" : "expand_more"}</span>
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="p-6 space-y-5">
          {children}
        </div>
      )}
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
    <div className="w-full flex items-stretch border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      <span className="flex items-center text-xs text-gray-400 bg-gray-50 px-3 border-r border-gray-200 whitespace-nowrap shrink-0 select-none">
        {prefix}
      </span>
      <input
        type="text"
        value={getSuffix(value)}
        onChange={(e) => onChange(e.target.value ? fullPrefix + e.target.value.trim() : "")}
        placeholder={placeholder}
        size={1}
        className="flex-1 min-w-0 px-3 py-2.5 text-sm focus:outline-none bg-white placeholder:text-gray-400"
      />
    </div>
  );
}
