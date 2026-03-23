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
  Users,
  Building2,
  X,
  CreditCard,
  SlidersHorizontal,
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

  const nav = isPlatformAdmin
    ? [
        { href: "/dashboard/clients", label: tr.nav_clients, icon: Building2 },
        { href: "/dashboard/plan-settings", label: tr.nav_plan_settings, icon: SlidersHorizontal },
        { href: "/dashboard/settings", label: tr.nav_settings, icon: Settings },
      ]
    : [
        { href: "/dashboard", label: tr.nav_dashboard, icon: LayoutDashboard },
        { href: "/dashboard/codes", label: tr.nav_codes, icon: QrCode },
        ...(isOwner || isAdmin ? [{ href: "/dashboard/users", label: tr.nav_users, icon: Users }] : []),
        ...(isOwner ? [{ href: "/dashboard/upgrade", label: tr.nav_plans, icon: CreditCard }] : []),
        { href: "/dashboard/settings", label: tr.nav_settings, icon: Settings },
      ];

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const dark = isPlatformAdmin;

  return (
    <aside className={`w-64 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out wide:sticky wide:top-0 wide:h-screen wide:translate-x-0 wide:overflow-y-auto ${open ? "translate-x-0" : "-translate-x-full"} ${dark ? "bg-gray-900 border-r border-gray-700" : "bg-white border-r border-gray-200"}`}>
      {/* Logo */}
      <div className={`h-16 flex items-center px-6 border-b ${dark ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className={`font-bold text-lg ${dark ? "text-white" : "text-gray-900"}`}>QR Plattform</span>
        </div>
        <button
          onClick={onClose}
          className={`wide:hidden p-1.5 rounded-lg transition-colors ${dark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        >
          <X className="w-5 h-5" />
        </button>
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
                  ? dark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600 text-white"
                  : dark
                  ? "text-gray-400 hover:bg-gray-800 hover:text-white"
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
      <div className={`p-3 border-t space-y-1 ${dark ? "border-gray-700" : "border-gray-200"}`}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <span>{tr.nav_language}</span>
          <span className="flex items-center gap-1 text-xs font-semibold">
            <span className={lang === "de" ? "text-blue-400" : dark ? "text-gray-600" : "text-gray-400"}>DE</span>
            <span className={dark ? "text-gray-600" : "text-gray-300"}>/</span>
            <span className={lang === "en" ? "text-blue-400" : dark ? "text-gray-600" : "text-gray-400"}>EN</span>
          </span>
        </button>
        {profileLoaded && !isPlatformAdmin && (isOwner ? (
          <>
            <Link
              href="/dashboard/upgrade"
              className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs text-gray-400">{tr.plan_label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline" />
              </span>
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between w-full px-3 py-1.5">
              <span className="text-xs text-gray-400">{tr.role_label}</span>
              <span className="text-xs font-semibold text-gray-700">
                {userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
              </span>
            </div>
            <Link
              href="/dashboard/upgrade"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">{tr.see_plans}</span>
            </Link>
          </>
        ))}
        {/* Account info + logout */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer group ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
          onClick={handleLogout}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dark ? "bg-gray-700 text-gray-200" : "bg-blue-100 text-blue-700"}`}>
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${dark ? "text-gray-200" : "text-gray-700"}`}>{userEmail}</p>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {isPlatformAdmin ? "Platform Admin" : isOwner ? tr.role_owner : userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
            </p>
          </div>
          <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors shrink-0" />
        </div>
      </div>
    </aside>
  );
}
