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
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 h-20 shadow-sm">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline outline-none"
            placeholder="Search QR assets..."
            type="text"
          />
        </div>
      </div>

      {/* Actions + User */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-primary transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200" />

        {/* User area with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-on-surface leading-tight">{displayName}</p>
              <p className="text-xs text-slate-500 leading-tight">
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
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-[0px_8px_24px_rgba(25,28,30,0.12)] border border-outline-variant/10 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-outline-variant/10">
                <p className="text-xs font-semibold text-on-surface truncate">{displayName}</p>
                <p className="text-xs text-outline truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error-container/20 transition-colors"
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
