"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState("Enterprise Admin");
  const [plan, setPlan] = useState<Plan>("free");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("qr-dark-mode") === "true";
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

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

        {/* User area — clicks through to settings */}
        <Link
          href="/dashboard/settings"
          title={tr.nav_settings}
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
        </Link>
      </div>
    </header>
  );
}
