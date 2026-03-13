"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Settings,
  LogOut,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/language";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tr, lang, toggleLang } = useLang();

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
