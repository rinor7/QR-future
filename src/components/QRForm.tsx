"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Plus, Link2, X } from "lucide-react";
import { CreateQRContact, ContactLink } from "@/lib/types";
import { useLang } from "@/lib/language";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const DEFAULTS: CreateQRContact = {
  qrLabel: "",
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  logoUrl: "",
  showLogoInQr: true,
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
  street: "",
  streetNr: "",
  plz: "",
  city: "",
  primaryColor: "#2563eb",
  bgImageUrl: "",
  notes: "",
  isActive: true,
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
}

export default function QRForm({ initial, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const { tr } = useLang();
  const [form, setForm] = useState<CreateQRContact>({ ...DEFAULTS, ...initial });
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
    setForm((prev) => ({ ...prev, [field]: value }));
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* QR Code Label */}
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

      {/* Identity */}
      <Section title={tr.section_identity}>
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
        <Field label={tr.field_title}>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="z.B. Geschäftsführer"
            className={input}
          />
        </Field>
        <Field label={tr.field_company}>
          <input
            type="text"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="z.B. Builtech Gruppe"
            className={input}
          />
        </Field>

        {/* Design: Background + Color + Logo */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Design</p>

          {/* Background image: preview left (30%), drop zone right (70%) */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">{tr.upload_bg}</p>
            <div className="flex gap-3 items-stretch">
              {/* Preview / placeholder */}
              <div className="w-[30%] shrink-0">
                {form.bgImageUrl ? (
                  <div className="relative h-full min-h-[80px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.bgImageUrl} alt="BG" className="w-full h-full object-cover rounded-xl border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={() => set("bgImageUrl", "")} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded-lg transition-colors shadow-sm">{tr.upload_remove}</button>
                  </div>
                ) : (
                  <div className="h-full min-h-[80px] bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-2xl opacity-20">🖼</span>
                  </div>
                )}
              </div>
              {/* Drop zone */}
              <label
                onDragOver={(e) => { e.preventDefault(); setBgDragging(true); }}
                onDragLeave={() => setBgDragging(false)}
                onDrop={handleBgDrop}
                className={`flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 text-sm transition-colors ${
                  bgDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                } ${bgUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 text-xs text-center">{bgUploading ? tr.upload_uploading : tr.upload_bg}</span>
                <span className="text-gray-400 text-xs text-center">{tr.upload_bg_hint}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBgUpload} />
              </label>
            </div>
            {bgError && <p className="text-xs text-red-500 mt-1">{bgError}</p>}
          </div>

          {/* Logo: drop zone left (70%), preview right (30%) */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">{tr.field_logo}</p>
            <div className="flex gap-3 items-stretch">
              {/* Drop zone */}
              <label
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={handleLogoDrop}
                className={`flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 text-sm transition-colors ${
                  logoDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                } ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 text-xs text-center">{logoUploading ? tr.upload_uploading : tr.upload_logo}</span>
                <span className="text-gray-400 text-xs text-center">{tr.upload_logo_hint}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
              </label>
              {/* Preview / placeholder */}
              <div className="w-[30%] shrink-0">
                {form.logoUrl ? (
                  <div className="relative h-full min-h-[80px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl border border-gray-200 bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={() => set("logoUrl", "")} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded-lg transition-colors shadow-sm">{tr.upload_remove}</button>
                  </div>
                ) : (
                  <div className="h-full min-h-[80px] bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-2xl opacity-20">🏷</span>
                  </div>
                )}
              </div>
            </div>
            {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
          </div>

          {/* Accent color + Logo toggle in one row 50/50 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">{tr.field_color}</p>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent shrink-0" />
                <span className="text-xs text-gray-500 font-mono">{form.primaryColor}</span>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-700 mb-1.5">{tr.qr_logo_in_center}</p>
              <div
                onClick={() => setForm((prev) => ({ ...prev, showLogoInQr: !prev.showLogoInQr }))}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${form.showLogoInQr ? "bg-blue-600" : "bg-gray-200"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showLogoInQr ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section title={tr.section_contact}>
        <Field label={tr.field_phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+41 123 456 789"
            className={input}
          />
        </Field>
        <Field label={tr.field_email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="max.mustermann@qr-card.ch"
            className={input}
          />
        </Field>
        <Field label={tr.field_website}>
          <input
            type="text"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            onBlur={(e) => { if (e.target.value) set("website", normalizeUrl(e.target.value.trim())); }}
            placeholder="www.qr-card.ch"
            className={input}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr.field_street}>
            <input
              type="text"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
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
      <Section title={tr.section_social}>
        <Field label={tr.field_linkedin}>
          <PrefixInput prefix="linkedin.com/in/" fullPrefix="https://linkedin.com/in/" value={form.linkedinUrl} onChange={(v) => set("linkedinUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_instagram}>
          <PrefixInput prefix="instagram.com/" fullPrefix="https://instagram.com/" value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_facebook}>
          <PrefixInput prefix="facebook.com/" fullPrefix="https://facebook.com/" value={form.facebookUrl} onChange={(v) => set("facebookUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_tiktok}>
          <PrefixInput prefix="tiktok.com/@" fullPrefix="https://tiktok.com/@" value={form.tiktokUrl} onChange={(v) => set("tiktokUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_snapchat}>
          <PrefixInput prefix="snapchat.com/add/" fullPrefix="https://snapchat.com/add/" value={form.snapchatUrl} onChange={(v) => set("snapchatUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_x}>
          <PrefixInput prefix="x.com/" fullPrefix="https://x.com/" value={form.xUrl} onChange={(v) => set("xUrl", v)} placeholder={tr.social_placeholder} />
        </Field>
        <Field label={tr.field_other_social}>
          <input type="text" value={form.otherSocialUrl} onChange={(e) => set("otherSocialUrl", e.target.value)} onBlur={(e) => { if (e.target.value) set("otherSocialUrl", normalizeUrl(e.target.value.trim())); }} placeholder="example.com" className={input} />
        </Field>
      </Section>

      {/* PDF / Links */}
      <Section title={tr.section_pdf}>
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
      <Section title={tr.section_notes}>
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
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const input =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400";

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
