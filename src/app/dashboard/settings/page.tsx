"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS } from "@/lib/types";
import { useLang } from "@/lib/language";
import { Zap, CreditCard, AlertTriangle } from "lucide-react";

const PLAN_COLORS: Record<Plan, { bg: string; text: string }> = {
  free:     { bg: "rgba(115,118,136,0.1)", text: "#737688" },
  star:     { bg: "rgba(180,83,9,0.1)",    text: "#b45309" },
  premium:  { bg: "rgba(0,62,199,0.1)",    text: "#003ec7" },
  platinum: { bg: "rgba(107,33,168,0.1)",  text: "#6b21a8" },
};

const inputClass = "w-full bg-brand-bg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text";
const inputStyle = { border: "1px solid rgba(195,197,217,0.5)" };
const labelClass = "block text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1.5";
const cardClass = "bg-brand-surface rounded-2xl p-5 shadow-ambient-sm";
const cardStyle = { border: "1px solid rgba(195,197,217,0.35)" };

export default function SettingsPage() {
  const { tr, lang, toggleLang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [planLimit, setPlanLimit] = useState<number | string>("-");
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

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
    });
    getUserProfile().then((p) => {
      if (p) {
        setPlan(p.plan);
        setIsOwner(p.userId === p.ownerId);
        setIsPlatformAdmin(p.isPlatformAdmin ?? false);
        setUserRole(p.role);
        setSupportEmail(p.supportEmail ?? "");
        setSupportEmailSaved(!!p.supportEmail);
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

  const planColor = PLAN_COLORS[plan];

  return (
    <div className="p-4 wide:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-brand-text">{tr.settings_title}</h1>
        <p className="text-brand-outline mt-1">{tr.settings_subtitle}</p>
      </div>

      {/* Row 1: Account Info | Change Email | Security */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Account Information */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="font-headline font-semibold text-brand-text mb-4 text-sm">{tr.settings_account}</h2>
          <div className="space-y-3">
            <div>
              <p className={labelClass}>E-Mail</p>
              <p className="text-sm text-brand-text font-medium truncate">{email}</p>
            </div>
            {!isPlatformAdmin && (
              <div>
                <p className={labelClass}>{tr.role_label}</p>
                <p className="text-sm text-brand-text font-medium">
                  {isOwner ? tr.role_owner : userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
                </p>
              </div>
            )}
            {isOwner && !isPlatformAdmin && (
              <div>
                <p className={labelClass}>Plan</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: planColor.bg, color: planColor.text }}>
                    {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline" />
                  </span>
                  <Link href="/dashboard/upgrade" className="text-xs text-brand-primary hover:underline">
                    {tr.settings_plan_change}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Email */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="font-headline font-semibold text-brand-text mb-4 text-sm">{tr.settings_email_change}</h2>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div>
              <label className={labelClass}>{tr.settings_email_current}</label>
              <p className="text-xs text-brand-outline font-mono truncate">{email}</p>
            </div>
            <div>
              <label className={labelClass}>{tr.settings_email_new}</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue@email.com"
                required
                className={inputClass}
                style={inputStyle}
              />
            </div>
            {emailError && <p className="text-xs text-brand-error">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-green-600">{tr.settings_email_success}</p>}
            <button type="submit" disabled={emailLoading} className="w-full btn-primary disabled:opacity-60 text-sm">
              {emailLoading ? tr.settings_email_saving : tr.settings_email_btn}
            </button>
          </form>
        </div>

        {/* Security / Change Password */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="font-headline font-semibold text-brand-text mb-4 text-sm">{tr.settings_pw_change}</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className={labelClass}>{tr.settings_pw_current}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>{tr.settings_pw_new}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>{tr.settings_pw_confirm}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} style={inputStyle} />
            </div>
            {pwError && <p className="text-xs text-brand-error">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600">{tr.settings_pw_success}</p>}
            <button type="submit" disabled={pwLoading} className="w-full btn-primary disabled:opacity-60 text-sm">
              {pwLoading ? tr.settings_pw_saving : tr.settings_pw_btn}
            </button>
          </form>
        </div>
      </div>

      {/* Platform Support Email (platform admin only) */}
      {isPlatformAdmin && (
        <div className={`${cardClass} mb-4`} style={cardStyle}>
          <h2 className="font-headline font-semibold text-brand-text mb-1 text-sm">{tr.settings_support_email_title ?? "Platform Contact Email"}</h2>
          <p className="text-xs text-brand-outline mb-4">{tr.settings_support_email_hint ?? "Shown to team members when a save error occurs."}</p>
          {supportEmailSaved && !editingSupport ? (
            <div className="flex items-center justify-between bg-brand-bg rounded-xl px-4 py-3" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
              <div>
                <p className="text-xs text-brand-outline mb-0.5">Email</p>
                <p className="text-sm font-medium text-brand-text-secondary">{supportEmail}</p>
              </div>
              <button onClick={() => setEditingSupport(true)} className="text-xs text-brand-primary hover:text-brand-primary-light font-medium">{tr.edit}</button>
            </div>
          ) : (
            <form onSubmit={handleSaveSupportEmail} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={labelClass}>Email</label>
                <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourcompany.com" autoFocus className={inputClass} style={inputStyle} />
              </div>
              <button type="submit" disabled={supportEmailLoading} className="btn-primary disabled:opacity-60 whitespace-nowrap text-sm">
                {supportEmailLoading ? "..." : tr.settings_support_email_btn}
              </button>
              {editingSupport && (
                <button type="button" onClick={() => setEditingSupport(false)} className="text-sm text-brand-outline hover:text-brand-text px-3 py-2.5">{tr.cancel}</button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Platform Preferences */}
      <div className={`${cardClass} mb-4`} style={cardStyle}>
        <h2 className="font-headline font-semibold text-brand-text mb-4 text-sm">Platform Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Regional */}
          <div>
            <p className={labelClass}>Regional</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-text-secondary">{tr.nav_language}</span>
                <button
                  onClick={toggleLang}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-bg transition-colors hover:bg-brand-surface-container"
                  style={{ border: "1px solid rgba(195,197,217,0.5)" }}
                >
                  <span className={lang === "de" ? "text-brand-primary" : "text-brand-outline"}>DE</span>
                  <span className="text-brand-outline-variant">/</span>
                  <span className={lang === "en" ? "text-brand-primary" : "text-brand-outline"}>EN</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Defaults */}
          <div>
            <p className={labelClass}>QR Defaults</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-text-secondary">Auto-generate QR</span>
                <div className="w-9 h-5 rounded-full bg-brand-primary relative cursor-pointer" style={{ opacity: 1 }}>
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <p className={labelClass}>Appearance</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-text-secondary">Light mode</span>
                <div className="w-9 h-5 rounded-full bg-brand-surface-container relative cursor-pointer" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plan Status */}
      {isOwner && !isPlatformAdmin && (
        <div className="rounded-2xl px-5 py-4 mb-4 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">Subscription Plan Status</p>
              <p className="font-headline font-bold text-white">{PLAN_LABELS[plan]} Plan</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{planUsed}</p>
              <p className="text-white/60 text-xs">QR Codes Used</p>
            </div>
            <Link
              href="/dashboard/upgrade"
              className="bg-white text-brand-primary font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Manage Plan
            </Link>
          </div>
        </div>
      )}

      {/* Deactivate Account */}
      <div className={cardClass} style={{ ...cardStyle, borderColor: "rgba(186,26,26,0.2)" }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(186,26,26,0.08)" }}>
            <AlertTriangle className="w-4.5 h-4.5 text-brand-error" style={{ width: "18px", height: "18px" }} />
          </div>
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-brand-text text-sm">Deactivate Account</h3>
            <p className="text-xs text-brand-outline mt-1">Permanently remove your account and all associated data. This action cannot be undone.</p>
          </div>
          <button className="text-sm font-semibold text-brand-error hover:bg-brand-error-container px-4 py-2 rounded-xl transition-colors whitespace-nowrap" style={{ border: "1px solid rgba(186,26,26,0.3)" }}>
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
