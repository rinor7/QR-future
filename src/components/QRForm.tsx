"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateQRContact } from "@/lib/types";
import { useLang } from "@/lib/language";

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

interface Props {
  initial?: Partial<CreateQRContact>;
  onSubmit: (data: CreateQRContact) => void;
  submitLabel: string;
}

export default function QRForm({ initial, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const { tr } = useLang();
  const [form, setForm] = useState<CreateQRContact>({ ...DEFAULTS, ...initial });

  function set(field: keyof CreateQRContact, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Identity */}
      <Section title={tr.section_identity}>
        <Field label={`${tr.field_name} *`} required>
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
        <Field label={tr.field_logo}>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://..."
            className={input}
          />
          <p className="text-xs text-gray-400 mt-1">{tr.field_logo_hint}</p>
        </Field>
        <Field label={tr.field_color}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <span className="text-sm text-gray-500 font-mono">{form.primaryColor}</span>
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

      {/* File / PDF */}
      <Section title={tr.section_pdf}>
        <Field label={tr.field_pdf_url}>
          <input
            type="url"
            value={form.pdfUrl}
            onChange={(e) => set("pdfUrl", e.target.value)}
            placeholder="https://... (Link zur PDF)"
            className={input}
          />
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
