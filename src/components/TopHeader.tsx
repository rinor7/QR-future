"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import type { Plan } from "@/lib/types";
import { useLang } from "@/lib/language";

export default function TopHeader({
  onActivityToggle,
  activityCount = 0,
}: {
  onActivityToggle?: () => void;
  activityCount?: number;
}) {
  const { lang, tr, toggleLang } = useLang();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("Enterprise Admin");
  const [plan, setPlan] = useState<Plan>("free");
  const [darkMode, setDarkMode] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const saved = localStorage.getItem("qr-dark-mode") === "true";
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  // Close profile menu on Escape, in addition to the backdrop click below.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileMenuOpen]);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("qr-dark-mode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? "");
        const meta = (user.user_metadata ?? {}) as { full_name?: string };
        setFullName(meta.full_name ?? "");
      }
    });
    getUserProfile().then((p) => {
      if (p) {
        setPlan(p.plan);
        const role = p.isPlatformAdmin
          ? "Platform Admin"
          : p.userId === p.ownerId
          ? tr.role_owner
          : p.role === "admin"
          ? tr.role_admin
          : tr.role_writer;
        setUserRole(role);
      }
    });
  }, []);

  const displayName = fullName.trim() || userEmail || "—";
  const initial = (fullName.trim() || userEmail).charAt(0).toUpperCase() || "?";
  const planLabel = plan !== "free" ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#eef1f8]/90 dark:bg-[#0f1117]/90 backdrop-blur-sm flex items-center justify-between px-8 h-16">
      {/* Left — page context (spacer) */}
      <div className="flex-1" />

      {/* Actions + User */}
      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          title={lang === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
          className="h-9 px-3 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors text-xs font-bold tracking-wide"
        >
          {lang === "de" ? "DE" : "EN"}
        </button>

        {/* Dark / Light toggle */}
        <button
          onClick={toggleDark}
          title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>

        {/* Activity feed toggle */}
        {onActivityToggle && (
          <button
            onClick={onActivityToggle}
            title="Activity feed"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {activityCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[#eef1f8] dark:border-[#0f1117]" />
            )}
          </button>
        )}

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />

        {/* User area — opens a small profile menu */}
        <button
          type="button"
          onClick={() => setProfileMenuOpen(true)}
          className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-1.5 transition-colors"
        >
          <div className="text-right hidden sm:block max-w-[220px]">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
              {userRole}{planLabel ? ` · ${planLabel}` : ""}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 border-2 border-white"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            {initial}
          </div>
        </button>
      </div>

      {/* Profile menu modal */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-end p-6 sm:p-8"
          onClick={() => setProfileMenuOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-2xl w-full max-w-xs mt-12 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-[#242736] flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(false)}
                aria-label="Close"
                className="shrink-0 w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              <Link
                href="/dashboard/settings"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-500">settings</span>
                {tr.nav_settings}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                {signingOut ? tr.signing_out : tr.sign_out}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
