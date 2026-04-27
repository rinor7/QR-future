"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";

type NavItem = { href: string; labelKey: keyof ReturnType<typeof useLang>["tr"]; icon: string };

const USER_NAV: NavItem[] = [
  { href: "/dashboard",         labelKey: "nav_dashboard", icon: "dashboard" },
  { href: "/dashboard/codes",     labelKey: "nav_codes",     icon: "qr_code_2" },
  { href: "/dashboard/analytics", labelKey: "nav_analytics", icon: "monitoring" },
  { href: "/dashboard/leads",     labelKey: "nav_leads",     icon: "contacts" },
  { href: "/dashboard/users",   labelKey: "nav_users",     icon: "group" },
  { href: "/dashboard/upgrade", labelKey: "nav_plans",     icon: "payments" },
  { href: "/dashboard/trash",   labelKey: "nav_trash",     icon: "delete" },
  { href: "/dashboard/settings",labelKey: "nav_settings",  icon: "settings" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/clients",       labelKey: "nav_clients",       icon: "corporate_fare" },
  { href: "/dashboard/plan-settings", labelKey: "nav_plan_settings", icon: "tune" },
  { href: "/dashboard/settings",      labelKey: "nav_settings",      icon: "settings" },
];

export default function Sidebar({ open, onClose, topOffset = 0 }: { open?: boolean; onClose?: () => void; topOffset?: number }) {
  const pathname = usePathname();
  const { tr } = useLang();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

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
        setSupportEmail(p.supportEmail ?? "");
      }
    });
    loadBranding();
    window.addEventListener("brand-updated", loadBranding);
    return () => window.removeEventListener("brand-updated", loadBranding);
  }, []);

  const baseNav = isPlatformAdmin ? ADMIN_NAV : USER_NAV.filter((item) => {
    if (item.href === "/dashboard/users")   return isOwner || isAdmin;
    if (item.href === "/dashboard/upgrade") return isOwner;
    if (item.href === "/dashboard/trash")   return isOwner;
    return true;
  });

  return (
    <aside
      style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
      className={`
        w-72 flex flex-col shrink-0 fixed left-0 z-50 bg-[#eef1f8] dark:bg-[#0f1117]
        transition-transform duration-300 ease-in-out
        wide:sticky wide:translate-x-0 wide:overflow-y-auto
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
            {brandName || "qr-card.ch"}
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
            {tr.sidebar_enterprise}
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
        {baseNav.map(({ href, labelKey, icon }) => {
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
              {tr[labelKey]}
            </Link>
          );
        })}
      </nav>

      {/* Create QR Code CTA */}
      {!isPlatformAdmin && (
        <div className="px-4 pt-4">
          <Link
            href="/dashboard/create"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 text-white font-headline font-bold text-sm py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            {tr.sidebar_create_qr}
          </Link>
        </div>
      )}

      {/* Contact Support */}
      {!isPlatformAdmin && supportEmail && (
        <div className="px-4 pt-3 pb-6">
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent("Support request")}`}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 py-2.5 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            {tr.contact_support}
          </a>
        </div>
      )}
      {!isPlatformAdmin && !supportEmail && <div className="pb-6" />}
    </aside>
  );
}
