"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS } from "@/lib/types";
import { useLang } from "@/lib/language";
import { Zap } from "lucide-react";

const PLAN_COLORS: Record<Plan, string> = {
  free:     "bg-brand-surface-container text-brand-text-secondary",
  star:     "bg-yellow-100 text-yellow-700",
  premium:  "bg-blue-100 text-brand-primary",
  platinum: "bg-purple-100 text-purple-700",
};

export default function SettingsPage() {
  const { tr } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

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
    if (!newEmail || newEmail === email) {
      setEmailError(tr.settings_email_error_same);
      return;
    }
    setEmailLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setEmailError(error.message);
    } else {
      setEmailSuccess(true);
      setNewEmail("");
    }
    setEmailLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwError(tr.settings_pw_error_match);
      return;
    }
    if (newPassword.length < 6) {
      setPwError(tr.settings_pw_error_short);
      return;
    }

    setPwLoading(true);
    const supabase = getSupabaseBrowser();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setPwError(tr.settings_pw_error_wrong);
      setPwLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  }

  const inputClass = "w-full bg-brand-surface rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text";
  const inputStyle = { border: "1px solid rgba(195,197,217,0.5)" };
  const cardClass = "bg-brand-surface rounded-2xl p-6 mb-6 shadow-ambient-sm";
  const cardStyle = { border: "1px solid rgba(195,197,217,0.35)" };

  return (
    <div className="p-4 wide:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-brand-text">{tr.settings_title}</h1>
        <p className="text-brand-outline mt-1">{tr.settings_subtitle}</p>
      </div>

      {/* Account Info */}
      <div className={cardClass} style={cardStyle}>
        <h2 className="font-headline text-lg font-semibold text-brand-text mb-4">{tr.settings_account}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-brand-outline uppercase tracking-wide">E-Mail</label>
            <p className="mt-1 text-sm text-brand-text font-medium">{email}</p>
          </div>
          {isPlatformAdmin ? null : isOwner ? (
            <div>
              <label className="text-xs font-semibold text-brand-outline uppercase tracking-wide">Plan</label>
              <div className="mt-1 flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                  {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline" />
                </span>
                <Link href="/dashboard/upgrade" className="text-xs text-brand-primary hover:underline">
                  {tr.settings_plan_change}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-brand-outline uppercase tracking-wide">{tr.role_label}</label>
                <p className="mt-1 text-sm text-brand-text font-medium">
                  {userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
                </p>
              </div>
              <div>
                <Link href="/dashboard/upgrade" className="text-xs text-brand-primary hover:underline">
                  {tr.our_plans}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Support Email — only for platform admin */}
      {isPlatformAdmin && (
        <div className={cardClass} style={cardStyle}>
          <h2 className="font-headline text-lg font-semibold text-brand-text mb-1">{tr.settings_support_email_title ?? "Platform Contact Email"}</h2>
          <p className="text-sm text-brand-outline mb-4">{tr.settings_support_email_hint ?? "Shown to team members when a save error occurs."}</p>
          {supportEmailSaved && !editingSupport ? (
            <div className="flex items-center justify-between bg-brand-surface-low rounded-xl px-4 py-3" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
              <div>
                <p className="text-xs text-brand-outline mb-0.5">Email</p>
                <p className="text-sm font-medium text-brand-text-secondary">{supportEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupport(true)}
                className="text-xs text-brand-primary hover:text-brand-primary-light font-medium transition-colors"
              >
                {tr.edit}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveSupportEmail} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-brand-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@yourcompany.com"
                  autoFocus
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={supportEmailLoading}
                className="btn-primary disabled:opacity-60 whitespace-nowrap"
              >
                {supportEmailLoading ? "..." : tr.settings_support_email_btn}
              </button>
              {editingSupport && (
                <button type="button" onClick={() => setEditingSupport(false)} className="text-sm text-brand-outline hover:text-brand-text px-3 py-2.5">
                  {tr.cancel}
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Change Email */}
      <div className={cardClass} style={cardStyle}>
        <h2 className="font-headline text-lg font-semibold text-brand-text mb-4">{tr.settings_email_change}</h2>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-1">{tr.settings_email_current}</label>
            <p className="text-sm text-brand-outline font-mono">{email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-1">{tr.settings_email_new}</label>
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
          {emailError && <p className="text-sm text-brand-error">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-green-600">{tr.settings_email_success}</p>}
          <button
            type="submit"
            disabled={emailLoading}
            className="w-full btn-primary disabled:opacity-60"
          >
            {emailLoading ? tr.settings_email_saving : tr.settings_email_btn}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className={cardClass} style={cardStyle}>
        <h2 className="font-headline text-lg font-semibold text-brand-text mb-4">{tr.settings_pw_change}</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-1">{tr.settings_pw_current}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-1">{tr.settings_pw_new}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-1">{tr.settings_pw_confirm}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {pwError && <p className="text-sm text-brand-error">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{tr.settings_pw_success}</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full btn-primary disabled:opacity-60"
          >
            {pwLoading ? tr.settings_pw_saving : tr.settings_pw_btn}
          </button>
        </form>
      </div>
    </div>
  );
}
