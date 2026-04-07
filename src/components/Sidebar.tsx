"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Zap, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/language";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS } from "@/lib/types";

const PLAN_COLORS: Record<Plan, string> = {
  free:     "bg-brand-surface-container text-brand-text-secondary",
  star:     "bg-yellow-100 text-yellow-700",
  premium:  "bg-blue-100 text-brand-primary",
  platinum: "bg-purple-100 text-purple-700",
};

type NavItem = { href: string; label: string; materialIcon: string };

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tr, lang, toggleLang } = useLang();
  const [plan, setPlan] = useState<Plan>("free");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p) {
        setPlan(p.plan);
        setIsPlatformAdmin(p.isPlatformAdmin ?? false);
        setIsAdmin(p.role === "admin");
        setIsOwner(p.userId === p.ownerId);
        setUserRole(p.role);
        setUserEmail(p.email ?? "");
      }
      setProfileLoaded(true);
    });
  }, []);

  const nav: NavItem[] = isPlatformAdmin
    ? [
        { href: "/dashboard/clients",      label: tr.nav_clients,       materialIcon: "corporate_fare" },
        { href: "/dashboard/plan-settings",label: tr.nav_plan_settings, materialIcon: "tune" },
        { href: "/dashboard/settings",     label: tr.nav_settings,      materialIcon: "settings" },
      ]
    : [
        { href: "/dashboard",              label: tr.nav_dashboard,     materialIcon: "dashboard" },
        { href: "/dashboard/codes",        label: tr.nav_codes,         materialIcon: "qr_code_2" },
        ...(isOwner || isAdmin ? [{ href: "/dashboard/users",   label: tr.nav_users,   materialIcon: "group" }] : []),
        ...(isOwner           ? [{ href: "/dashboard/upgrade",  label: tr.nav_plans,   materialIcon: "payments" }] : []),
        { href: "/dashboard/settings",     label: tr.nav_settings,      materialIcon: "settings" },
      ];

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const dark = isPlatformAdmin;

  return (
    <aside
      className={`
        w-64 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-50
        transition-transform duration-300 ease-in-out
        wide:sticky wide:top-0 wide:h-screen wide:translate-x-0 wide:overflow-y-auto
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${dark ? "bg-gray-900" : "bg-slate-50"}
      `}
    >
      {/* Logo */}
      <div className="px-6 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            <span className="material-symbols-outlined text-xl">qr_code_2</span>
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight font-headline leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
              QR Orchestrator
            </h2>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-gray-500" : "text-slate-500"}`}>
              Enterprise Edition
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`wide:hidden absolute top-4 right-4 p-1.5 rounded-xl transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {nav.map(({ href, label, materialIcon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                active
                  ? dark
                    ? "text-blue-400 bg-blue-900/20 rounded-l-xl border-r-4 border-blue-400"
                    : "text-primary bg-blue-50/80 rounded-l-xl border-r-4 border-primary"
                  : dark
                  ? "text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl"
                  : "text-slate-500 hover:bg-slate-100 hover:text-primary rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{materialIcon}</span>
              <span className="font-headline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Create QR button */}
      {!isPlatformAdmin && (
        <div className="px-4 mt-4 mb-2">
          <Link
            href="/dashboard/create"
            className="w-full text-white py-3 px-4 rounded-xl font-headline font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform text-sm"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create QR Code
          </Link>
        </div>
      )}

      {/* Footer */}
      <div
        className={`p-3 space-y-0.5 ${dark ? "border-t border-gray-800" : ""}`}
        style={!dark ? { borderTop: "1px solid rgba(195,197,217,0.25)" } : undefined}
      >
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            dark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <span>{tr.nav_language}</span>
          <span className="flex items-center gap-1 text-xs font-semibold">
            <span className={lang === "de" ? "text-primary" : dark ? "text-gray-600" : "text-slate-400"}>DE</span>
            <span className={dark ? "text-gray-700" : "text-slate-300"}>/</span>
            <span className={lang === "en" ? "text-primary" : dark ? "text-gray-600" : "text-slate-400"}>EN</span>
          </span>
        </button>

        {profileLoaded && !isPlatformAdmin && (isOwner ? (
          <Link
            href="/dashboard/upgrade"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="text-xs text-slate-400">{tr.plan_label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
              {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline ml-0.5" />
            </span>
          </Link>
        ) : (
          <div className="flex items-center justify-between w-full px-3 py-2">
            <span className="text-xs text-slate-400">{tr.role_label}</span>
            <span className="text-xs font-semibold text-slate-500">
              {userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
            </span>
          </div>
        ))}

        {/* Account + logout */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer group ${
            dark ? "hover:bg-gray-800" : "hover:bg-slate-100"
          }`}
          onClick={handleLogout}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${dark ? "text-gray-200" : "text-slate-700"}`}>{userEmail}</p>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-slate-400"}`}>
              {isPlatformAdmin ? "Platform Admin" : isOwner ? tr.role_owner : userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
            </p>
          </div>
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
        </div>
      </div>
    </aside>
  );
}
