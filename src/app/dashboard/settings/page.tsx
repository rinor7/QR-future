"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS } from "@/lib/types";
import { useLang } from "@/lib/language";

export default function SettingsPage() {
  const { tr, lang, toggleLang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [planUsed, setPlanUsed] = useState(0);

  const [supportEmail, setSupportEmail] = useState("");
  const [supportEmailLoading, setSupportEmailLoading] = useState(false);
  const [supportEmailSaved, setSupportEmailSaved] = useState(false);
  const [editingSupport, setEditingSupport] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [errorCorrection, setErrorCorrection] = useState("H");
  const [leadCaptureDisabled, setLeadCaptureDisabled] = useState(false);
  const [leadCaptureSaving, setLeadCaptureSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  // Branding / White label
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  // Custom domain
  const [customDomain, setCustomDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainStatus, setDomainStatus] = useState<{ domain: string | null; verified: boolean; vercelStatus?: string; cname?: { host: string; target: string } } | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedEc = localStorage.getItem("qr-error-correction") ?? "H";
    setErrorCorrection(savedEc);
  }, []);

  function handleErrorCorrectionChange(val: string) {
    setErrorCorrection(val);
    localStorage.setItem("qr-error-correction", val);
  }

  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookError(null);
    setWebhookSaved(false);
    if (webhookUrl && !webhookUrl.startsWith("https://")) {
      setWebhookError("Webhook URL must start with https://");
      return;
    }
    setWebhookSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ lead_webhook_url: webhookUrl || null }).eq("user_id", user.id);
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    }
    setWebhookSaving(false);
  }

  async function handleToggleLeadCapture(val: boolean) {
    setLeadCaptureDisabled(val);
    setLeadCaptureSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ lead_capture_disabled: val }).eq("user_id", user.id);
    }
    setLeadCaptureSaving(false);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
    });
    getUserProfile().then(async (p) => {
      if (p) {
        setPlan(p.plan);
        setIsOwner(p.userId === p.ownerId);
        setIsPlatformAdmin(p.isPlatformAdmin ?? false);
        setUserRole(p.role);
        setSupportEmail(p.supportEmail ?? "");
        setSupportEmailSaved(!!p.supportEmail);
        // Load lead capture + webhook settings
        const supabaseInner = getSupabaseBrowser();
        const { data: { user: u } } = await supabaseInner.auth.getUser();
        if (u) {
          const { data: prof } = await supabaseInner.from("profiles").select("lead_capture_disabled, lead_webhook_url, brand_name, brand_logo_url, brand_primary_color, custom_domain, custom_domain_verified").eq("user_id", u.id).single();
          if (prof) {
            setLeadCaptureDisabled(!!prof.lead_capture_disabled);
            setWebhookUrl(prof.lead_webhook_url ?? "");
            setBrandName(prof.brand_name ?? "");
            setBrandLogoUrl(prof.brand_logo_url ?? "");
            setBrandColor(prof.brand_primary_color ?? "#2563eb");
            if (prof.custom_domain) {
              setCustomDomain(prof.custom_domain);
              setDomainStatus({ domain: prof.custom_domain, verified: !!prof.custom_domain_verified });
            }
          }
        }
      }
    });
    // Get QR count for plan usage
    import("@/lib/store").then(({ getAllContacts }) => {
      getAllContacts().then((c) => setPlanUsed(c.length));
    });
  }, [router]);

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        brand_name: brandName || null,
        brand_logo_url: brandLogoUrl || null,
        brand_primary_color: brandColor || null,
      }).eq("user_id", user.id);
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 3000);
      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent("brand-updated"));
    }
    setBrandSaving(false);
  }

  async function handleBrandLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandLogoUploading(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${user.id}/brand-logo.${ext}`;
      await supabase.storage.from("Uploads").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("Uploads").getPublicUrl(path);
      setBrandLogoUrl(publicUrl);
    }
    setBrandLogoUploading(false);
  }

  async function handleSaveDomain(e: React.FormEvent) {
    e.preventDefault();
    setDomainSaving(true);
    const res = await fetch("/api/custom-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: customDomain.trim().toLowerCase() || null }),
    });
    const data = await res.json();
    setDomainStatus(data.ok ? { domain: data.domain, verified: false, vercelStatus: data.vercelStatus, cname: data.cname } : null);
    setDomainSaving(false);
  }

  async function handleCheckDomain() {
    setDomainChecking(true);
    const res = await fetch("/api/custom-domain");
    const data = await res.json();
    setDomainStatus((prev) => prev ? { ...prev, verified: data.verified } : data);
    setDomainChecking(false);
  }

  async function handleSaveSupportEmail(e: React.FormEvent) {
    e.preventDefault();
    setSupportEmailLoading(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ support_email: supportEmail }).eq("user_id", user.id);
      setSupportEmailSaved(true);
      setEditingSupport(false);
    }
    setSupportEmailLoading(false);
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    if (!newEmail || newEmail === email) { setEmailError(tr.settings_email_error_same); return; }
    setEmailLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { setEmailError(error.message); } else { setEmailSuccess(true); setNewEmail(""); }
    setEmailLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) { setPwError(tr.settings_pw_error_match); return; }
    if (newPassword.length < 6) { setPwError(tr.settings_pw_error_short); return; }
    setPwLoading(true);
    const supabase = getSupabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) { setPwError(tr.settings_pw_error_wrong); setPwLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPwError(error.message); } else {
      setPwSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
    setPwLoading(false);
  }

  return (
    <div className="pt-8 pb-12 px-4 sm:px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your account orchestration and global platform preferences.</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Account Information (8 cols) */}
        <section className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600">
                <span className="material-symbols-outlined">person</span>
              </div>
              <h3 className="text-2xl font-bold font-headline">Account Information</h3>
            </div>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              {isOwner ? "Owner" : userRole === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          <form onSubmit={handleChangeEmail} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Full Name</label>
                <input type="text" defaultValue="" placeholder="Your name" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Email Address</label>
                <input type="email" value={newEmail || email} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Organization Name</label>
              <input type="text" defaultValue="" placeholder="Your organization" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-green-600">{tr.settings_email_success}</p>}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Plan:</span>
                <span className="text-sm font-semibold text-blue-600">{PLAN_LABELS[plan]}</span>
                {isOwner && <Link href="/dashboard/upgrade" className="text-xs text-blue-600 hover:underline ml-1">Change</Link>}
              </div>
              <button type="submit" disabled={emailLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 w-full sm:w-auto">
                {emailLoading ? tr.settings_email_saving : "Update Account"}
              </button>
            </div>
          </form>
        </section>

        {/* Security (4 cols) */}
        <section className="col-span-12 lg:col-span-4 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h3 className="text-xl font-bold font-headline">Security</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600">{tr.settings_pw_success}</p>}
            <button type="submit" disabled={pwLoading} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
              {pwLoading ? tr.settings_pw_saving : "Change Password"}
            </button>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Two-Factor Auth</span>
                  <p className="text-xs text-slate-400 mt-0.5">Extra login security via authenticator app</p>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">Coming soon</span>
              </div>
            </div>
          </form>
        </section>

        {/* Platform Preferences (12 cols) */}
        <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined">tune</span>
            </div>
            <h3 className="text-2xl font-bold font-headline">Platform Preferences</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Regional */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">language</span>
                Regional
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130] hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors cursor-pointer">
                  <span className="text-sm">Language</span>
                  <button onClick={toggleLang} className="text-sm font-bold text-blue-600">{lang === "de" ? "Deutsch" : "English (EN)"}</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130] hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors cursor-pointer">
                  <span className="text-sm">Timezone</span>
                  <span className="text-sm font-bold text-blue-600">UTC+1 (CET)</span>
                </div>
              </div>
            </div>
            {/* QR Defaults */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">analytics</span>
                QR Defaults
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130]">
                  <span className="text-sm">Default Error Correction</span>
                  <select
                    value={errorCorrection}
                    onChange={(e) => handleErrorCorrectionChange(e.target.value)}
                    className="bg-gray-50 dark:bg-[#1e2130] border-none text-sm font-bold text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg focus:ring-0 cursor-pointer"
                  >
                    <option value="H">High (30%)</option>
                    <option value="Q">Medium-High (25%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="L">Low (7%)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130]">
                  <span className="text-sm">Auto-generate tracking</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Features */}
            {(isOwner || userRole === "admin") && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">feature_search</span>
                  Features
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130]">
                    <div>
                      <p className="text-sm font-medium">Lead Capture</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Allow QR profiles to collect visitor contacts</p>
                    </div>
                    <button
                      onClick={() => handleToggleLeadCapture(!leadCaptureDisabled)}
                      disabled={leadCaptureSaving}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-3 ${leadCaptureDisabled ? "bg-slate-200 dark:bg-slate-700" : "bg-blue-600"} disabled:opacity-60`}
                      aria-label="Toggle lead capture"
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${leadCaptureDisabled ? "left-1" : "translate-x-6"}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CRM / Export (owner or admin only) */}
        {(isOwner || userRole === "admin") && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex flex-wrap items-start gap-4 mb-8">
              <div className="bg-teal-500/10 p-3 rounded-xl text-teal-600 shrink-0">
                <span className="material-symbols-outlined">hub</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold font-headline">CRM / Export</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Export leads or connect to external tools via webhook</p>
              </div>
              <a
                href="/api/leads/export"
                download
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export All Leads (CSV)
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Webhook / Zapier */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">webhook</span>
                  Webhook / Zapier
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  When a new lead is captured, we will POST the lead data to this URL. Works with Zapier, Make, n8n, or any custom endpoint.
                </p>
                <form onSubmit={handleSaveWebhook} className="space-y-3">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {webhookError && <p className="text-xs text-red-500">{webhookError}</p>}
                  <div className="flex items-center gap-3">
                    <button type="submit" disabled={webhookSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {webhookSaving ? "Saving…" : "Save Webhook"}
                    </button>
                    {webhookSaved && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Saved
                      </span>
                    )}
                    {webhookUrl && !webhookSaving && (
                      <button type="button" onClick={() => { setWebhookUrl(""); }} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </form>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Payload preview</p>
                  <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">{`{
  "event": "lead.captured",
  "timestamp": "2025-01-01T12:00:00Z",
  "lead": { "name": "…", "email": "…", "company": "…" },
  "source": { "qr_label": "…", "employee": "…" }
}`}</pre>
                </div>
              </div>

              {/* Lead Assignment info */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">assignment_ind</span>
                  Lead Assignment
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Every lead is automatically assigned to the employee whose QR code was scanned. The employee name and QR label are included in all exports and webhook payloads.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <span className="material-symbols-outlined text-[18px] text-teal-600 shrink-0 mt-0.5">qr_code</span>
                    <div>
                      <p className="text-sm font-semibold">QR → Employee → Lead</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Each QR code belongs to one employee. When someone scans it and submits their contact, the lead is tagged to that employee.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">analytics</span>
                    <div>
                      <p className="text-sm font-semibold">Per-QR Analytics</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View and export leads per QR code from the Analytics page of each code.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Branding / White Label (owner or admin only) */}
        {(isOwner || userRole === "admin") && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-purple-500/10 p-3 rounded-xl text-purple-600">
                <span className="material-symbols-outlined">style</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold font-headline">Branding</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">White-label the platform and set up your custom domain</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* White Label */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">palette</span>
                  White Label
                </h4>
                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Replaces &quot;QR Orchestrator&quot; in the sidebar and dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Logo</label>
                    {brandLogoUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={brandLogoUrl} alt="Brand logo" className="h-10 w-10 object-contain rounded-lg bg-white border border-slate-200 dark:border-slate-700" />
                        <span className="text-sm text-slate-900 dark:text-slate-100 flex-1 truncate">Logo uploaded</span>
                        <button type="button" onClick={() => setBrandLogoUrl("")} className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors ${brandLogoUploading ? "opacity-60 pointer-events-none" : ""}`}>
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">upload</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{brandLogoUploading ? "Uploading…" : "Upload logo (PNG, SVG, JPG)"}</span>
                        <input type="file" accept="image/*" className="sr-only" onChange={handleBrandLogoUpload} />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Color</label>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#242736] rounded-xl px-4 py-3">
                      <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent shrink-0" />
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">{brandColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={brandSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {brandSaving ? "Saving…" : "Save Branding"}
                    </button>
                    {brandSaved && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Custom Domain */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">domain</span>
                  Custom Domain
                </h4>
                <form onSubmit={handleSaveDomain} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Domain</label>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="card.yourcompany.com"
                      className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">QR codes will use this domain instead of the default URL</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="submit" disabled={domainSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {domainSaving ? "Saving…" : "Save Domain"}
                    </button>
                    {domainStatus?.domain && (
                      <button type="button" onClick={handleCheckDomain} disabled={domainChecking} className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60">
                        {domainChecking ? "Checking…" : "Check DNS"}
                      </button>
                    )}
                  </div>
                </form>

                {/* DNS Instructions */}
                {domainStatus?.domain && (
                  <div className="mt-5 space-y-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${domainStatus.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      <span className="material-symbols-outlined text-[16px]">{domainStatus.verified ? "check_circle" : "pending"}</span>
                      {domainStatus.verified ? "Domain verified and active" : "Waiting for DNS propagation"}
                    </div>
                    {domainStatus.vercelStatus === "registered" ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Domain registered with Vercel automatically.</p>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-3">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Add this DNS record at your domain registrar:</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</div>
                          <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase">Host</div>
                          <div className="font-semibold text-slate-500 dark:text-slate-400 uppercase">Value</div>
                          <div className="font-mono text-slate-900 dark:text-slate-100 bg-gray-50 dark:bg-[#242736] rounded px-2 py-1">CNAME</div>
                          <div className="font-mono text-slate-900 dark:text-slate-100 bg-gray-50 dark:bg-[#242736] rounded px-2 py-1 truncate">{domainStatus.cname?.host ?? customDomain}</div>
                          <div className="font-mono text-slate-900 dark:text-slate-100 bg-gray-50 dark:bg-[#242736] rounded px-2 py-1 truncate">{domainStatus.cname?.target ?? "cname.vercel-dns.com"}</div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">DNS changes can take up to 48 hours to propagate.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Platform Support Email (platform admin only) */}
        {isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <h3 className="text-xl font-bold font-headline mb-2">{tr.settings_support_email_title ?? "Platform Contact Email"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{tr.settings_support_email_hint ?? "Shown to team members when a save error occurs."}</p>
            {supportEmailSaved && !editingSupport ? (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#242736] rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Contact Email</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{supportEmail}</p>
                </div>
                <button onClick={() => setEditingSupport(true)} className="text-xs text-blue-600 hover:underline font-medium">{tr.edit}</button>
              </div>
            ) : (
              <form onSubmit={handleSaveSupportEmail} className="flex gap-3 items-end">
                <div className="flex-1">
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourcompany.com" autoFocus className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={supportEmailLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-60">{supportEmailLoading ? "..." : tr.settings_support_email_btn}</button>
                {editingSupport && <button type="button" onClick={() => setEditingSupport(false)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 px-4 py-3">{tr.cancel}</button>}
              </form>
            )}
          </section>
        )}

        {/* Billing (12 cols) */}
        {isOwner && !isPlatformAdmin && (
          <section className="col-span-12 overflow-hidden relative bg-blue-900 rounded-xl p-8 text-white shadow-lg">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-300">Subscription Status</span>
                <h3 className="text-2xl sm:text-3xl font-bold font-headline mt-1">{PLAN_LABELS[plan]} Plan</h3>
                <p className="text-blue-200 mt-2">Manage your QR Orchestrator subscription.</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm block text-blue-300">QR Codes Used</span>
                  <span className="text-2xl font-bold">{planUsed} Used</span>
                </div>
                <Link href="/dashboard/upgrade" className="bg-white text-blue-900 dark:bg-blue-900 dark:text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-800 transition-colors shadow-xl">
                  Manage Billing
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-red-50 dark:bg-red-900/10 rounded-xl">
          <div>
            <h4 className="text-lg font-bold text-red-800 dark:text-red-200 font-headline">Deactivate Account</h4>
            <p className="text-sm text-red-800 dark:text-red-200/70 mt-1">Permanently remove all QR data and orchestrator logs. This action is irreversible.</p>
          </div>
          <button className="border-2 border-red-500 text-red-500 px-6 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all w-full sm:w-auto shrink-0">
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
