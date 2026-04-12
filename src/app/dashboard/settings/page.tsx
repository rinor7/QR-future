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

  const [darkMode, setDarkMode] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState("H");
  const [leadCaptureDisabled, setLeadCaptureDisabled] = useState(false);
  const [leadCaptureSaving, setLeadCaptureSaving] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedDark = localStorage.getItem("qr-dark-mode") === "true";
    const savedEc = localStorage.getItem("qr-error-correction") ?? "H";
    setDarkMode(savedDark);
    setErrorCorrection(savedEc);
    if (savedDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function handleToggleDarkMode(val: boolean) {
    setDarkMode(val);
    localStorage.setItem("qr-dark-mode", String(val));
    if (val) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function handleErrorCorrectionChange(val: string) {
    setErrorCorrection(val);
    localStorage.setItem("qr-error-correction", val);
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
        // Load lead capture disabled state
        const supabaseInner = getSupabaseBrowser();
        const { data: { user: u } } = await supabaseInner.auth.getUser();
        if (u) {
          const { data: prof } = await supabaseInner.from("profiles").select("lead_capture_disabled").eq("user_id", u.id).single();
          if (prof) setLeadCaptureDisabled(!!prof.lead_capture_disabled);
        }
      }
    });
    // Get QR count for plan usage
    import("@/lib/store").then(({ getAllContacts }) => {
      getAllContacts().then((c) => setPlanUsed(c.length));
    });
  }, [router]);

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
    <div className="pt-8 pb-12 px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold text-on-surface tracking-tight font-headline">Settings</h2>
        <p className="text-outline mt-2">Manage your account orchestration and global platform preferences.</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Account Information (8 cols) */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl text-primary">
                <span className="material-symbols-outlined">person</span>
              </div>
              <h3 className="text-2xl font-bold font-headline">Account Information</h3>
            </div>
            <span className="bg-secondary-container/20 text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              {isOwner ? "Owner" : userRole === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          <form onSubmit={handleChangeEmail} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-outline font-semibold">Full Name</label>
                <input type="text" defaultValue="" placeholder="Your name" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-outline font-semibold">Email Address</label>
                <input type="email" value={newEmail || email} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-outline font-semibold">Organization Name</label>
              <input type="text" defaultValue="" placeholder="Your organization" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
            </div>
            {emailError && <p className="text-xs text-error">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-green-600">{tr.settings_email_success}</p>}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-outline font-medium">Plan:</span>
                <span className="text-sm font-semibold text-primary">{PLAN_LABELS[plan]}</span>
                {isOwner && <Link href="/dashboard/upgrade" className="text-xs text-primary hover:underline ml-1">Change</Link>}
              </div>
              <button type="submit" disabled={emailLoading} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-60">
                {emailLoading ? tr.settings_email_saving : "Update Account"}
              </button>
            </div>
          </form>
        </section>

        {/* Security (4 cols) */}
        <section className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-tertiary-container/10 p-3 rounded-xl text-tertiary-container">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h3 className="text-xl font-bold font-headline">Security</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-outline font-semibold">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-outline font-semibold">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-outline font-semibold">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
            </div>
            {pwError && <p className="text-xs text-error">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600">{tr.settings_pw_success}</p>}
            <button type="submit" disabled={pwLoading} className="w-full bg-surface-container-high text-primary px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-colors disabled:opacity-60">
              {pwLoading ? tr.settings_pw_saving : "Change Password"}
            </button>
            <div className="pt-2 border-t border-outline-variant/15">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Two-Factor Auth</span>
                <div className="w-12 h-6 bg-primary-container rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </form>
        </section>

        {/* Platform Preferences (12 cols) */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-secondary/10 p-3 rounded-xl text-secondary">
              <span className="material-symbols-outlined">tune</span>
            </div>
            <h3 className="text-2xl font-bold font-headline">Platform Preferences</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Regional */}
            <div className="space-y-4">
              <h4 className="font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-outline">language</span>
                Regional
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-colors cursor-pointer">
                  <span className="text-sm">Language</span>
                  <button onClick={toggleLang} className="text-sm font-bold text-primary">{lang === "de" ? "Deutsch" : "English (EN)"}</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-container-low transition-colors cursor-pointer">
                  <span className="text-sm">Timezone</span>
                  <span className="text-sm font-bold text-primary">UTC+1 (CET)</span>
                </div>
              </div>
            </div>
            {/* QR Defaults */}
            <div className="space-y-4">
              <h4 className="font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-outline">analytics</span>
                QR Defaults
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
                  <span className="text-sm">Default Error Correction</span>
                  <select
                    value={errorCorrection}
                    onChange={(e) => handleErrorCorrectionChange(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-primary p-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="H">High (30%)</option>
                    <option value="Q">Medium-High (25%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="L">Low (7%)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
                  <span className="text-sm">Auto-generate tracking</span>
                  <div className="w-12 h-6 bg-primary-container rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            {/* Appearance */}
            <div className="space-y-4">
              <h4 className="font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-outline">palette</span>
                Appearance
              </h4>
              <div className="flex gap-4">
                <div
                  onClick={() => handleToggleDarkMode(false)}
                  className={`flex-1 p-4 rounded-xl text-center cursor-pointer transition-all ${!darkMode ? "border-2 border-primary bg-primary/5" : "border border-outline-variant/20 bg-surface opacity-60 hover:opacity-80"}`}
                >
                  <span className="material-symbols-outlined block mb-1">light_mode</span>
                  <span className="text-xs font-bold">Light</span>
                </div>
                <div
                  onClick={() => handleToggleDarkMode(true)}
                  className={`flex-1 p-4 rounded-xl text-center cursor-pointer transition-all ${darkMode ? "border-2 border-primary bg-primary/5" : "border border-outline-variant/20 bg-surface opacity-60 hover:opacity-80"}`}
                >
                  <span className="material-symbols-outlined block mb-1">dark_mode</span>
                  <span className="text-xs font-bold">Dark</span>
                </div>
              </div>
            </div>
            {/* Features */}
            {(isOwner || userRole === "admin") && (
              <div className="space-y-4">
                <h4 className="font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline">feature_search</span>
                  Features
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
                    <div>
                      <p className="text-sm font-medium">Lead Capture</p>
                      <p className="text-xs text-outline mt-0.5">Allow QR profiles to collect visitor contacts</p>
                    </div>
                    <button
                      onClick={() => handleToggleLeadCapture(!leadCaptureDisabled)}
                      disabled={leadCaptureSaving}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-3 ${leadCaptureDisabled ? "bg-outline-variant/30" : "bg-primary-container"} disabled:opacity-60`}
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

        {/* Platform Support Email (platform admin only) */}
        {isPlatformAdmin && (
          <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <h3 className="text-xl font-bold font-headline mb-2">{tr.settings_support_email_title ?? "Platform Contact Email"}</h3>
            <p className="text-sm text-outline mb-6">{tr.settings_support_email_hint ?? "Shown to team members when a save error occurs."}</p>
            {supportEmailSaved && !editingSupport ? (
              <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-outline mb-0.5">Contact Email</p>
                  <p className="text-sm font-medium text-on-surface">{supportEmail}</p>
                </div>
                <button onClick={() => setEditingSupport(true)} className="text-xs text-primary hover:underline font-medium">{tr.edit}</button>
              </div>
            ) : (
              <form onSubmit={handleSaveSupportEmail} className="flex gap-3 items-end">
                <div className="flex-1">
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourcompany.com" autoFocus className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary" />
                </div>
                <button type="submit" disabled={supportEmailLoading} className="bg-primary text-white px-6 py-3 rounded-xl font-bold disabled:opacity-60">{supportEmailLoading ? "..." : tr.settings_support_email_btn}</button>
                {editingSupport && <button type="button" onClick={() => setEditingSupport(false)} className="text-sm text-outline hover:text-on-surface px-4 py-3">{tr.cancel}</button>}
              </form>
            )}
          </section>
        )}

        {/* Billing (12 cols) */}
        {isOwner && !isPlatformAdmin && (
          <section className="col-span-12 overflow-hidden relative bg-blue-900 rounded-xl p-8 text-white shadow-lg">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-blue-300">Subscription Status</span>
                <h3 className="text-3xl font-bold font-headline mt-1">{PLAN_LABELS[plan]} Plan</h3>
                <p className="text-blue-200 mt-2">Manage your QR Orchestrator subscription.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm block text-blue-300">QR Codes Used</span>
                  <span className="text-2xl font-bold">{planUsed} Used</span>
                </div>
                <Link href="/dashboard/upgrade" className="bg-white text-blue-900 dark:bg-blue-900 dark:text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-800 transition-colors shadow-xl">
                  Manage Billing
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-outline-variant/15">
        <div className="flex items-center justify-between p-6 bg-error-container/20 rounded-xl">
          <div>
            <h4 className="text-lg font-bold text-on-error-container font-headline">Deactivate Account</h4>
            <p className="text-sm text-on-error-container/70 mt-1">Permanently remove all QR data and orchestrator logs. This action is irreversible.</p>
          </div>
          <button className="border-2 border-error text-error px-6 py-2 rounded-xl font-bold hover:bg-error hover:text-white transition-all">
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
