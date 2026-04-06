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
  free:     "bg-brand-surface-container text-brand-text-secondary",
  star:     "bg-yellow-100 text-yellow-700",
  premium:  "bg-blue-100 text-brand-primary",
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
    <aside className={`
      w-64 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-50
      transition-transform duration-300 ease-in-out
      wide:sticky wide:top-0 wide:h-screen wide:translate-x-0 wide:overflow-y-auto
      ${open ? "translate-x-0" : "-translate-x-full"}
      ${dark
        ? "bg-gray-900"
        : "bg-brand-surface"
      }
    `}
    style={!dark ? { boxShadow: "2px 0 24px rgba(25,28,30,0.06)" } : undefined}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center px-5 ${dark ? "border-b border-gray-800" : ""}`}>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
            <QrCode className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
          </div>
          <span className={`font-headline font-bold text-lg tracking-tight ${dark ? "text-white" : "text-brand-text"}`}>
            QR Plattform
          </span>
        </div>
        <button
          onClick={onClose}
          className={`wide:hidden p-1.5 rounded-xl transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-brand-outline hover:text-brand-text hover:bg-brand-surface-low"}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "text-white shadow-ambient-sm"
                  : dark
                  ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                  : "text-brand-text-secondary hover:bg-brand-surface-low hover:text-brand-text"
              }`}
              style={active ? { background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" } : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-3 space-y-0.5 ${dark ? "border-t border-gray-800" : ""}`}
        style={!dark ? { borderTop: "1px solid rgba(195, 197, 217, 0.25)" } : undefined}
      >
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            dark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-brand-text-secondary hover:bg-brand-surface-low"
          }`}
        >
          <span>{tr.nav_language}</span>
          <span className="flex items-center gap-1 text-xs font-semibold">
            <span className={lang === "de" ? "text-brand-primary" : dark ? "text-gray-600" : "text-brand-outline-variant"}>DE</span>
            <span className={dark ? "text-gray-700" : "text-brand-outline-variant"}>/</span>
            <span className={lang === "en" ? "text-brand-primary" : dark ? "text-gray-600" : "text-brand-outline-variant"}>EN</span>
          </span>
        </button>

        {profileLoaded && !isPlatformAdmin && (isOwner ? (
          <Link
            href="/dashboard/upgrade"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-brand-surface-low transition-colors"
          >
            <span className="text-xs text-brand-outline">{tr.plan_label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
              {PLAN_LABELS[plan]} <Zap className="w-3 h-3 inline ml-0.5" />
            </span>
          </Link>
        ) : (
          <div className="flex items-center justify-between w-full px-3 py-2">
            <span className="text-xs text-brand-outline">{tr.role_label}</span>
            <span className="text-xs font-semibold text-brand-text-secondary">
              {userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
            </span>
          </div>
        ))}

        {/* Account + logout */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors cursor-pointer group ${
            dark ? "hover:bg-gray-800" : "hover:bg-brand-surface-low"
          }`}
          onClick={handleLogout}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${dark ? "text-gray-200" : "text-brand-text"}`}>{userEmail}</p>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-brand-outline"}`}>
              {isPlatformAdmin ? "Platform Admin" : isOwner ? tr.role_owner : userRole === "admin" ? tr.role_admin : userRole === "writer" ? tr.role_writer : tr.role_reader}
            </p>
          </div>
          <LogOut className="w-4 h-4 text-brand-outline group-hover:text-brand-error transition-colors shrink-0" />
        </div>
      </div>
    </aside>
  );
}
