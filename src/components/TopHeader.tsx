"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import type { Plan } from "@/lib/types";

export default function TopHeader() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("Enterprise Admin");
  const [plan, setPlan] = useState<Plan>("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? "");
    });
    getUserProfile().then((p) => {
      if (p) {
        setPlan(p.plan);
        const role = p.isPlatformAdmin
          ? "Platform Admin"
          : p.userId === p.ownerId
          ? "Owner"
          : p.role === "admin"
          ? "Admin"
          : p.role === "writer"
          ? "Writer"
          : "Reader";
        setUserRole(role);
      }
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = userEmail.split("@")[0] || "—";
  const initial = displayName[0]?.toUpperCase() ?? "?";
  const planLabel = plan !== "free" ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#eef1f8]/90 dark:bg-[#0f1117]/90 backdrop-blur-sm flex items-center justify-between px-8 h-16">
      {/* Left — page context (spacer) */}
      <div className="flex-1" />

      {/* Actions + User */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />

        {/* User area with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-1.5 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{displayName}</p>
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

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1d27] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.18)] border border-slate-200 dark:border-[#242736] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-[#242736]">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
