"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface QRTemplate {
  id: string;
  name: string;
  primary_color: string;
  theme: string;
  bg_image_url: string | null;
  show_logo_in_qr: boolean;
  lead_capture_enabled: boolean;
  company: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  phones: string | null;
  emails: string | null;
  websites: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  snapchat_url: string | null;
  x_url: string | null;
  other_social_url: string | null;
  qr_dot_style: string | null;
  qr_corner_style: string | null;
  qr_dot_color: string | null;
  qr_bg_color: string | null;
  qr_gradient: boolean;
  qr_gradient_color: string | null;
  locked_fields: string[];
}

export interface OrgDefaults {
  organizationName?: string;
  brandLogoUrl?: string;
  acctPhone?: string;
  acctEmail?: string;
  acctWebsite?: string;
  acctLinkedin?: string;
  acctInstagram?: string;
  acctFacebook?: string;
  acctTiktok?: string;
  acctSnapchat?: string;
  acctX?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (t: QRTemplate) => void;
  editing?: QRTemplate | null;
  orgDefaults?: OrgDefaults;
}

type FieldValues = Record<string, string | boolean>;

const FIELD_GROUPS = [
  {
    key: "company_info",
    label: "Company Info",
    icon: "business",
    fields: [
      { key: "company", label: "Company Name", type: "text", fromAccount: "organizationName" as const },
      { key: "logo_url", label: "Logo URL", type: "url", fromAccount: "brandLogoUrl" as const },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "social",
    label: "Social Links",
    icon: "link",
    fields: [
      { key: "linkedin_url", label: "LinkedIn", type: "url", fromAccount: "acctLinkedin" as const },
      { key: "instagram_url", label: "Instagram", type: "url", fromAccount: "acctInstagram" as const },
      { key: "facebook_url", label: "Facebook", type: "url", fromAccount: "acctFacebook" as const },
      { key: "tiktok_url", label: "TikTok", type: "url", fromAccount: "acctTiktok" as const },
      { key: "snapchat_url", label: "Snapchat", type: "url", fromAccount: "acctSnapchat" as const },
      { key: "x_url", label: "X / Twitter", type: "url", fromAccount: "acctX" as const },
      { key: "other_social_url", label: "Other Social", type: "url" },
    ],
  },
  {
    key: "branding",
    label: "Branding",
    icon: "palette",
    fields: [
      { key: "primary_color", label: "Accent Color", type: "color" },
      { key: "theme", label: "Theme", type: "select", options: ["classic", "dark", "minimal"] },
      { key: "show_logo_in_qr", label: "Show Logo in QR", type: "boolean" },
      { key: "lead_capture_enabled", label: "Lead Capture", type: "boolean" },
    ],
  },
  {
    key: "qr_style",
    label: "QR Style",
    icon: "qr_code_2",
    fields: [
      { key: "qr_dot_style", label: "Dot Style", type: "select", options: ["square", "rounded", "dots", "classy"] },
      { key: "qr_corner_style", label: "Corner Style", type: "select", options: ["square", "extra-rounded", "dot"] },
      { key: "qr_dot_color", label: "QR Color", type: "color" },
      { key: "qr_bg_color", label: "QR Background", type: "color" },
      { key: "qr_gradient", label: "Gradient", type: "boolean" },
      { key: "qr_gradient_color", label: "Gradient Color", type: "color" },
    ],
  },
] as const;

const FIELD_DEFAULTS: Record<string, string | boolean> = {
  primary_color: "#2563eb",
  theme: "classic",
  show_logo_in_qr: true,
  lead_capture_enabled: false,
  qr_dot_style: "square",
  qr_corner_style: "square",
  qr_dot_color: "#000000",
  qr_bg_color: "#ffffff",
  qr_gradient: false,
  qr_gradient_color: "#2563eb",
};

function parseJsonArray<T>(val: string | null | undefined): T[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function templateToValues(t: QRTemplate): FieldValues {
  return {
    company: t.company ?? "",
    logo_url: t.logo_url ?? "",
    website: t.website ?? "",
    description: t.description ?? "",
    linkedin_url: t.linkedin_url ?? "",
    instagram_url: t.instagram_url ?? "",
    facebook_url: t.facebook_url ?? "",
    tiktok_url: t.tiktok_url ?? "",
    snapchat_url: t.snapchat_url ?? "",
    x_url: t.x_url ?? "",
    other_social_url: t.other_social_url ?? "",
    primary_color: t.primary_color,
    theme: t.theme,
    show_logo_in_qr: t.show_logo_in_qr,
    lead_capture_enabled: t.lead_capture_enabled,
    qr_dot_style: t.qr_dot_style ?? "square",
    qr_corner_style: t.qr_corner_style ?? "square",
    qr_dot_color: t.qr_dot_color ?? "#000000",
    qr_bg_color: t.qr_bg_color ?? "#ffffff",
    qr_gradient: t.qr_gradient,
    qr_gradient_color: t.qr_gradient_color ?? "#2563eb",
  };
}

export default function TemplateEditorModal({ open, onClose, onSaved, editing, orgDefaults }: Props) {
  const [name, setName] = useState("");
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<FieldValues>({});
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["company_info"]));

  // Multi-value arrays for phones, emails, websites
  const [tplPhones, setTplPhones] = useState<{ number: string; label: string }[]>([]);
  const [tplEmails, setTplEmails] = useState<{ email: string; label: string }[]>([]);
  const [tplWebsites, setTplWebsites] = useState<{ url: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setIncluded(new Set(editing.locked_fields));
      setValues(templateToValues(editing));
      setTplPhones(parseJsonArray(editing.phones));
      setTplEmails(parseJsonArray(editing.emails));
      setTplWebsites(parseJsonArray(editing.websites));
      const groups = new Set<string>();
      FIELD_GROUPS.forEach((g) => {
        if (g.fields.some((f) => editing.locked_fields.includes(f.key))) groups.add(g.key);
      });
      if (["phones", "emails", "websites"].some((k) => editing.locked_fields.includes(k))) {
        groups.add("company_info");
      }
      if (groups.size === 0) groups.add("company_info");
      setOpenGroups(groups);
    } else {
      setName("");
      setIncluded(new Set());
      setValues({});
      setTplPhones([]);
      setTplEmails([]);
      setTplWebsites([]);
      setOpenGroups(new Set(["company_info"]));
    }
  }, [open, editing]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleField(key: string, defaultVal: string | boolean) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (values[key] === undefined || values[key] === "") {
          setValues((v) => ({ ...v, [key]: FIELD_DEFAULTS[key] ?? defaultVal }));
        }
      }
      return next;
    });
  }

  function toggleArrayField(key: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (key === "phones" && tplPhones.length === 0) setTplPhones([{ number: "", label: "" }]);
        if (key === "emails" && tplEmails.length === 0) setTplEmails([{ email: "", label: "" }]);
        if (key === "websites" && tplWebsites.length === 0) setTplWebsites([{ url: "", label: "" }]);
      }
      return next;
    });
  }

  function setVal(key: string, val: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function fetchFromAccount(key: string, accountKey: keyof OrgDefaults) {
    const val = orgDefaults?.[accountKey];
    if (val) {
      setValues((prev) => ({ ...prev, [key]: val }));
      setIncluded((prev) => { const next = new Set(prev); next.add(key); return next; });
    }
  }

  function fetchPhonesFromAccount() {
    const phone = orgDefaults?.acctPhone;
    if (!phone) return;
    setTplPhones([{ number: phone, label: "" }]);
    setIncluded((prev) => { const next = new Set(prev); next.add("phones"); return next; });
  }

  function fetchEmailsFromAccount() {
    const email = orgDefaults?.acctEmail;
    if (!email) return;
    setTplEmails([{ email, label: "" }]);
    setIncluded((prev) => { const next = new Set(prev); next.add("emails"); return next; });
  }

  function fetchWebsitesFromAccount() {
    const website = orgDefaults?.acctWebsite;
    if (!website) return;
    setTplWebsites([{ url: website, label: "" }]);
    setIncluded((prev) => { const next = new Set(prev); next.add("websites"); return next; });
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const lockedFields = Array.from(included);
    const payload = {
      name: name.trim(),
      locked_fields: lockedFields,
      primary_color: (values.primary_color as string) || "#2563eb",
      theme: (values.theme as string) || "classic",
      show_logo_in_qr: values.show_logo_in_qr !== false,
      lead_capture_enabled: values.lead_capture_enabled === true,
      company: (values.company as string) || null,
      logo_url: (values.logo_url as string) || null,
      website: (values.website as string) || null,
      description: (values.description as string) || null,
      phones: included.has("phones") && tplPhones.length > 0 ? JSON.stringify(tplPhones.filter((p) => p.number)) : null,
      emails: included.has("emails") && tplEmails.length > 0 ? JSON.stringify(tplEmails.filter((e) => e.email)) : null,
      websites: included.has("websites") && tplWebsites.length > 0 ? JSON.stringify(tplWebsites.filter((w) => w.url)) : null,
      linkedin_url: (values.linkedin_url as string) || null,
      instagram_url: (values.instagram_url as string) || null,
      facebook_url: (values.facebook_url as string) || null,
      tiktok_url: (values.tiktok_url as string) || null,
      snapchat_url: (values.snapchat_url as string) || null,
      x_url: (values.x_url as string) || null,
      other_social_url: (values.other_social_url as string) || null,
      qr_dot_style: (values.qr_dot_style as string) || null,
      qr_corner_style: (values.qr_corner_style as string) || null,
      qr_dot_color: (values.qr_dot_color as string) || null,
      qr_bg_color: (values.qr_bg_color as string) || null,
      qr_gradient: values.qr_gradient === true,
      qr_gradient_color: (values.qr_gradient_color as string) || null,
    };

    const res = editing
      ? await fetch(`/api/templates/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    const saved = await res.json();
    if (saved.id) onSaved(saved);
    setSaving(false);
    onClose();
  }

  if (!open) return null;

  const inputCls = "w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const totalLocked = included.size;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#242736] shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{editing ? "Edit Template" : "New Template"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Check fields to include — they will be locked when applied to a QR code</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp Standard"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Field groups */}
          {FIELD_GROUPS.map((group) => {
            let activeCount = group.fields.filter((f) => included.has(f.key)).length;
            if (group.key === "company_info") {
              if (included.has("phones")) activeCount++;
              if (included.has("emails")) activeCount++;
              if (included.has("websites")) activeCount++;
            }
            const isOpen = openGroups.has(group.key);
            return (
              <div key={group.key} className="border border-slate-100 dark:border-[#242736] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#242736] hover:bg-slate-100 dark:hover:bg-[#2a2e3e] transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">{group.icon}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{group.label}</span>
                    {activeCount > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">{activeCount} locked</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">{isOpen ? "expand_less" : "expand_more"}</span>
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-50 dark:divide-[#242736]">
                    {group.fields.map((field) => {
                      const isChecked = included.has(field.key);
                      const val = values[field.key];
                      const fromAccountKey = "fromAccount" in field ? field.fromAccount as keyof OrgDefaults : null;
                      const hasAccountValue = fromAccountKey ? !!orgDefaults?.[fromAccountKey] : false;

                      return (
                        <div key={field.key} className="px-4 py-3 bg-white dark:bg-[#1a1d27]">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              id={`field-${field.key}`}
                              checked={isChecked}
                              onChange={() => toggleField(field.key, typeof FIELD_DEFAULTS[field.key] === "boolean" ? false : "")}
                              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                            />
                            <label htmlFor={`field-${field.key}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                              {field.label}
                              {isChecked && <span className="ml-2 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">🔒 Locked</span>}
                            </label>
                            {hasAccountValue && fromAccountKey && (
                              <button
                                type="button"
                                onClick={() => fetchFromAccount(field.key, fromAccountKey)}
                                className="text-xs text-blue-600 hover:underline shrink-0"
                              >
                                ← from account
                              </button>
                            )}
                          </div>

                          {isChecked && (
                            <div className="ml-7">
                              {field.type === "text" && (
                                <input type="text" value={(val as string) || ""} onChange={(e) => setVal(field.key, e.target.value)} placeholder={field.label} className={inputCls} />
                              )}
                              {field.type === "url" && (
                                <input type="text" value={(val as string) || ""} onChange={(e) => setVal(field.key, e.target.value)} placeholder="https://" className={inputCls} />
                              )}
                              {field.type === "textarea" && (
                                <textarea value={(val as string) || ""} onChange={(e) => setVal(field.key, e.target.value)} placeholder={field.label} rows={2} className={`${inputCls} resize-none`} />
                              )}
                              {field.type === "color" && (
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl overflow-hidden w-fit">
                                  <input type="color" value={(val as string) || "#000000"} onChange={(e) => setVal(field.key, e.target.value)} className="w-10 h-10 cursor-pointer border-0 bg-transparent p-1" />
                                  <span className="text-sm font-mono text-slate-600 dark:text-slate-300 pr-3">{(val as string) || "#000000"}</span>
                                </div>
                              )}
                              {field.type === "select" && "options" in field && (
                                <select value={(val as string) || ""} onChange={(e) => setVal(field.key, e.target.value)} className={inputCls}>
                                  {field.options.map((o) => (
                                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                                  ))}
                                </select>
                              )}
                              {field.type === "boolean" && (
                                <div
                                  onClick={() => setVal(field.key, !(val as boolean))}
                                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${val ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}
                                >
                                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Phone / Email / Website array fields — only in Company Info group */}
                    {group.key === "company_info" && (
                      <>
                        {/* Phones */}
                        <div className="px-4 py-3 bg-white dark:bg-[#1a1d27]">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              id="field-phones"
                              checked={included.has("phones")}
                              onChange={() => toggleArrayField("phones")}
                              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                            />
                            <label htmlFor="field-phones" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                              Phone Numbers
                              {included.has("phones") && <span className="ml-2 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">🔒 Locked</span>}
                            </label>
                            {orgDefaults?.acctPhone && (
                              <button type="button" onClick={fetchPhonesFromAccount} className="text-xs text-blue-600 hover:underline shrink-0">
                                ← from account
                              </button>
                            )}
                          </div>
                          {included.has("phones") && (
                            <div className="ml-7 space-y-2">
                              {tplPhones.map((ph, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={ph.number}
                                      onChange={(e) => { const next = [...tplPhones]; next[i] = { ...next[i], number: e.target.value }; setTplPhones(next); }}
                                      placeholder="+41 79 123 45 67"
                                      className={inputCls}
                                    />
                                  </div>
                                  <div className="w-28 shrink-0">
                                    <input
                                      type="text"
                                      value={ph.label}
                                      onChange={(e) => { const next = [...tplPhones]; next[i] = { ...next[i], label: e.target.value }; setTplPhones(next); }}
                                      placeholder="Label"
                                      className={inputCls}
                                    />
                                  </div>
                                  <button type="button" onClick={() => setTplPhones(tplPhones.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {tplPhones.length < 4 && (
                                <button type="button" onClick={() => setTplPhones([...tplPhones, { number: "", label: "" }])} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  <span className="material-symbols-outlined text-[14px]">add</span>Add phone
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Emails */}
                        <div className="px-4 py-3 bg-white dark:bg-[#1a1d27]">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              id="field-emails"
                              checked={included.has("emails")}
                              onChange={() => toggleArrayField("emails")}
                              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                            />
                            <label htmlFor="field-emails" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                              Email Addresses
                              {included.has("emails") && <span className="ml-2 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">🔒 Locked</span>}
                            </label>
                            {orgDefaults?.acctEmail && (
                              <button type="button" onClick={fetchEmailsFromAccount} className="text-xs text-blue-600 hover:underline shrink-0">
                                ← from account
                              </button>
                            )}
                          </div>
                          {included.has("emails") && (
                            <div className="ml-7 space-y-2">
                              {tplEmails.map((em, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="email"
                                      value={em.email}
                                      onChange={(e) => { const next = [...tplEmails]; next[i] = { ...next[i], email: e.target.value }; setTplEmails(next); }}
                                      placeholder="info@company.com"
                                      className={inputCls}
                                    />
                                  </div>
                                  <div className="w-28 shrink-0">
                                    <input
                                      type="text"
                                      value={em.label}
                                      onChange={(e) => { const next = [...tplEmails]; next[i] = { ...next[i], label: e.target.value }; setTplEmails(next); }}
                                      placeholder="Label"
                                      className={inputCls}
                                    />
                                  </div>
                                  <button type="button" onClick={() => setTplEmails(tplEmails.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {tplEmails.length < 3 && (
                                <button type="button" onClick={() => setTplEmails([...tplEmails, { email: "", label: "" }])} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  <span className="material-symbols-outlined text-[14px]">add</span>Add email
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Websites */}
                        <div className="px-4 py-3 bg-white dark:bg-[#1a1d27]">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              id="field-websites"
                              checked={included.has("websites")}
                              onChange={() => toggleArrayField("websites")}
                              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                            />
                            <label htmlFor="field-websites" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                              Websites
                              {included.has("websites") && <span className="ml-2 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">🔒 Locked</span>}
                            </label>
                            {orgDefaults?.acctWebsite && (
                              <button type="button" onClick={fetchWebsitesFromAccount} className="text-xs text-blue-600 hover:underline shrink-0">
                                ← from account
                              </button>
                            )}
                          </div>
                          {included.has("websites") && (
                            <div className="ml-7 space-y-2">
                              {tplWebsites.map((ws, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={ws.url}
                                      onChange={(e) => { const next = [...tplWebsites]; next[i] = { ...next[i], url: e.target.value }; setTplWebsites(next); }}
                                      placeholder="www.company.com"
                                      className={inputCls}
                                    />
                                  </div>
                                  <div className="w-28 shrink-0">
                                    <input
                                      type="text"
                                      value={ws.label}
                                      onChange={(e) => { const next = [...tplWebsites]; next[i] = { ...next[i], label: e.target.value }; setTplWebsites(next); }}
                                      placeholder="Label"
                                      className={inputCls}
                                    />
                                  </div>
                                  <button type="button" onClick={() => setTplWebsites(tplWebsites.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {tplWebsites.length < 3 && (
                                <button type="button" onClick={() => setTplWebsites([...tplWebsites, { url: "", label: "" }])} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  <span className="material-symbols-outlined text-[14px]">add</span>Add website
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#242736] flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">
            {totalLocked === 0 ? "No fields selected — template won't lock anything" : `${totalLocked} field${totalLocked !== 1 ? "s" : ""} will be locked when applied`}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#242736] rounded-xl hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
