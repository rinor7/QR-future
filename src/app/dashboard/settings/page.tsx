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
  free: "bg-gray-100 text-gray-600",
  star: "bg-yellow-100 text-yellow-700",
  premium: "bg-blue-100 text-blue-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function SettingsPage() {
  const { tr } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

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
        setUserRole(p.role);
      }
    });
  }, [router]);

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

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.settings_title}</h1>
        <p className="text-gray-500 mt-1">{tr.settings_subtitle}</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tr.settings_account}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-Mail</label>
            <p className="mt-1 text-sm text-gray-900 font-medium">{email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</label>
            <div className="mt-1 flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline" />
              </span>
              {isOwner ? (
                <Link href="/dashboard/upgrade" className="text-xs text-blue-600 hover:underline">
                  {tr.settings_plan_change}
                </Link>
              ) : (
                <Link href="/dashboard/upgrade" className="text-xs text-blue-600 hover:underline">
                  {tr.our_plans}
                </Link>
              )}
            </div>
          </div>
          {!isOwner && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{tr.role_label}</label>
              <p className="mt-1 text-sm text-gray-900 font-medium">
                {userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Email */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tr.settings_email_change}</h2>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.settings_email_current}</label>
            <p className="text-sm text-gray-500 font-mono">{email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.settings_email_new}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@email.com"
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-green-600">{tr.settings_email_success}</p>}
          <button
            type="submit"
            disabled={emailLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            {emailLoading ? tr.settings_email_saving : tr.settings_email_btn}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{tr.settings_pw_change}</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.settings_pw_current}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.settings_pw_new}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.settings_pw_confirm}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{tr.settings_pw_success}</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            {pwLoading ? tr.settings_pw_saving : tr.settings_pw_btn}
          </button>
        </form>
      </div>
    </div>
  );
}
