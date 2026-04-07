"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan } from "@/lib/types";

export default function TopHeader() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [plan, setPlan] = useState<Plan>("free");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? "");
    });
    getUserProfile().then((p) => {
      if (p) {
        setPlan(p.plan);
        const role = p.userId === p.ownerId ? "Owner" : p.role === "admin" ? "Admin" : p.role === "writer" ? "Writer" : "Reader";
        setUserRole(role);
      }
    });
  }, []);

  const initial = userEmail[0]?.toUpperCase() ?? "?";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md flex items-center justify-between px-8 h-20 shadow-sm">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-all placeholder:text-outline"
            placeholder="Search assets..."
            type="text"
            readOnly
          />
        </div>
      </div>

      {/* Actions + User */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="p-2 text-outline hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant/30" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface truncate max-w-[160px]">{userEmail || "—"}</p>
            <p className="text-xs text-outline">{userRole} {plan !== "free" ? `· ${planLabel}` : ""}</p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
