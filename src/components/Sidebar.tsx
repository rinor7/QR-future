"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getUserProfile } from "@/lib/store";

type NavItem = { href: string; label: string; icon: string };

const USER_NAV: NavItem[] = [
  { href: "/dashboard",         label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/codes",   label: "QR Codes",  icon: "qr_code_2" },
  { href: "/dashboard/leads",   label: "Leads",     icon: "contacts" },
  { href: "/dashboard/nfc",     label: "NFC Cards", icon: "tap_and_play" },
  { href: "/dashboard/users",   label: "Users",     icon: "group" },
  { href: "/dashboard/upgrade", label: "Plans",     icon: "payments" },
  { href: "/dashboard/settings",label: "Settings",  icon: "settings" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/clients",       label: "Clients",       icon: "corporate_fare" },
  { href: "/dashboard/plan-settings", label: "Plan Settings", icon: "tune" },
  { href: "/dashboard/settings",      label: "Settings",      icon: "settings" },
];

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");

  async function loadBranding() {
    const supabase = (await import("@/lib/supabase-browser")).getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
    const ownerId = data?.owner_id ?? user.id;
    const { data: prof } = await supabase.from("profiles").select("brand_name, brand_logo_url, brand_primary_color").eq("user_id", ownerId).single();
    if (prof) {
      setBrandName(prof.brand_name ?? "");
      setBrandLogoUrl(prof.brand_logo_url ?? "");
      setBrandColor(prof.brand_primary_color ?? "");
    }
  }

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p) {
        setIsPlatformAdmin(p.isPlatformAdmin ?? false);
        setIsAdmin(p.role === "admin");
        setIsOwner(p.userId === p.ownerId);
      }
    });
    loadBranding();
    window.addEventListener("brand-updated", loadBranding);
    return () => window.removeEventListener("brand-updated", loadBranding);
  }, []);

  const baseNav = isPlatformAdmin ? ADMIN_NAV : USER_NAV.filter((item) => {
    if (item.href === "/dashboard/users")   return isOwner || isAdmin;
    if (item.href === "/dashboard/nfc")     return isOwner || isAdmin;
    if (item.href === "/dashboard/upgrade") return isOwner;
    return true;
  });

  return (
    <aside
      className={`
        w-64 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-50 bg-[#eef1f8] dark:bg-[#0f1117]
        transition-transform duration-300 ease-in-out
        wide:sticky wide:top-0 wide:h-screen wide:translate-x-0 wide:overflow-y-auto
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden"
          style={brandLogoUrl ? {} : { background: brandColor ? `linear-gradient(135deg, ${brandColor}cc 0%, ${brandColor} 100%)` : "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
        >
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogoUrl} alt="logo" className="w-10 h-10 object-contain" />
          ) : (
            <span className="material-symbols-outlined text-xl">qr_code_2</span>
          )}
        </div>
        <div>
          <h1 className="text-base font-bold font-headline leading-tight text-slate-900 tracking-tight">
            {brandName || "QR Orchestrator"}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
            Enterprise Suite
          </p>
        </div>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="wide:hidden ml-auto p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {baseNav.map(({ href, label, icon }) => {
          const active = href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold font-headline transition-colors duration-150 ${
                active
                  ? "text-primary dark:text-white bg-blue-50 dark:bg-blue-600/20 rounded-l-xl border-r-4 border-primary"
                  : "text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Create QR Code CTA */}
      {!isPlatformAdmin && (
        <div className="px-4 pt-4 pb-10">
          <Link
            href="/dashboard/create"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 text-white font-headline font-bold text-sm py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create QR Code
          </Link>
        </div>
      )}
    </aside>
  );
}
