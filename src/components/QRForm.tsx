"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { CreateQRContact } from "@/lib/types";
import { useLang } from "@/lib/language";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const DEFAULTS: CreateQRContact = {
  name: "",
  title: "",
  company: "",
  logoUrl: "",
  phone: "",
  email: "",
  website: "",
  linkedinUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  pdfUrl: "",
  pdfLabel: "Dokument öffnen",
  address: "",
  primaryColor: "#2563eb",
  notes: "",
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
    .from("uploads")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
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
  const [pdfUploading, setPdfUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (file.size > MAX_SIZE) {
      setLogoError("Datei zu groß. Maximum 14 MB.");
      return;
    }
    try {
      setLogoUploading(true);
      const toUpload =
        file.size > COMPRESS_THRESHOLD ? await compressImage(file) : file;
      const url = await uploadToStorage("logos", toUpload, userId);
      set("logoUrl", url);
    } catch {
      setLogoError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    if (file.size > MAX_SIZE) {
      setPdfError("Datei zu groß. Maximum 14 MB.");
      return;
    }
    try {
      setPdfUploading(true);
      const url = await uploadToStorage("files", file, userId);
      set("pdfUrl", url);
    } catch {
      setPdfError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPdfUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Identity */}
      <Section title={tr.section_identity}>
        <Field label={tr.field_name} required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="z.B. Max Mustermann"
            required
            className={input}
          />
        </Field>
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

        {/* Logo upload */}
        <Field label={tr.field_logo}>
          <div className="space-y-2">
            {form.logoUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => set("logoUrl", "")}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Entfernen
                </button>
              </div>
            )}
            <label
              className={`flex items-center gap-2 cursor-pointer border border-gray-200 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors w-full ${
                logoUploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                {logoUploading ? "Wird hochgeladen…" : "Logo hochladen"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleLogoUpload}
              />
            </label>
            {logoError && (
              <p className="text-xs text-red-500">{logoError}</p>
            )}
            <p className="text-xs text-gray-400">
              Max. 14 MB · Wird automatisch komprimiert wenn nötig
            </p>
          </div>
        </Field>

        <Field label={tr.field_color}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <span className="text-sm text-gray-500 font-mono">
              {form.primaryColor}
            </span>
          </div>
        </Field>
      </Section>

      {/* Contact */}
      <Section title={tr.section_contact}>
        <Field label={tr.field_phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+43 123 456 789"
            className={input}
          />
        </Field>
        <Field label={tr.field_email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@beispiel.at"
            className={input}
          />
        </Field>
        <Field label={tr.field_website}>
          <input
            type="url"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://www.beispiel.at"
            className={input}
          />
        </Field>
        <Field label={tr.field_address}>
          <input
            type="text"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Musterstraße 1, 1010 Wien"
            className={input}
          />
        </Field>
      </Section>

      {/* Social */}
      <Section title={tr.section_social}>
        <Field label={tr.field_linkedin}>
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={(e) => set("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className={input}
          />
        </Field>
        <Field label={tr.field_instagram}>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => set("instagramUrl", e.target.value)}
            placeholder="https://instagram.com/..."
            className={input}
          />
        </Field>
        <Field label={tr.field_facebook}>
          <input
            type="url"
            value={form.facebookUrl}
            onChange={(e) => set("facebookUrl", e.target.value)}
            placeholder="https://facebook.com/..."
            className={input}
          />
        </Field>
      </Section>

      {/* PDF upload */}
      <Section title={tr.section_pdf}>
        <Field label={tr.field_pdf_url}>
          <div className="space-y-2">
            {form.pdfUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={form.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Aktuelle Datei öffnen
                </a>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => set("pdfUrl", "")}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Entfernen
                </button>
              </div>
            )}
            <label
              className={`flex items-center gap-2 cursor-pointer border border-gray-200 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors w-full ${
                pdfUploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                {pdfUploading ? "Wird hochgeladen…" : "PDF hochladen"}
              </span>
              <input
                type="file"
                accept=".pdf"
                className="sr-only"
                onChange={handlePdfUpload}
              />
            </label>
            {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}
            <p className="text-xs text-gray-400">Max. 14 MB · Nur PDF-Dateien</p>
          </div>
        </Field>
        <Field label={tr.field_pdf_label}>
          <input
            type="text"
            value={form.pdfLabel}
            onChange={(e) => set("pdfLabel", e.target.value)}
            placeholder="z.B. Broschüre öffnen"
            className={input}
          />
        </Field>
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
