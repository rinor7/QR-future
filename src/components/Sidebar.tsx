"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  QrCode,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/language";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS } from "@/lib/types";

const PLAN_COLORS: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600",
  star: "bg-yellow-100 text-yellow-700",
  premium: "bg-blue-100 text-blue-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tr, lang, toggleLang } = useLang();
  const [plan, setPlan] = useState<Plan>("free");

  useEffect(() => {
    getUserProfile().then((p) => { if (p) setPlan(p.plan); });
  }, []);

  const nav = [
    { href: "/dashboard", label: tr.nav_dashboard, icon: LayoutDashboard },
    { href: "/dashboard/codes", label: tr.nav_codes, icon: QrCode },
    { href: "/dashboard/settings", label: tr.nav_settings, icon: Settings },
  ];

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">QR Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span>Language</span>
          <span className="flex items-center gap-1 text-xs font-semibold">
            <span className={lang === "de" ? "text-blue-600" : "text-gray-400"}>DE</span>
            <span className="text-gray-300">/</span>
            <span className={lang === "en" ? "text-blue-600" : "text-gray-400"}>EN</span>
          </span>
        </button>
        <Link
          href="/dashboard/upgrade"
          className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs text-gray-400">{tr.plan_label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
            {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline" />
          </span>
        </Link>
        <div className="text-xs text-gray-400 text-center py-1">v1.0.0</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {tr.logout}
        </button>
      </div>
    </aside>
  );
}
