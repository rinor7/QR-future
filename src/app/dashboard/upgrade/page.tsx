"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan } from "@/lib/types";
import { useLang } from "@/lib/language";

interface PlanMeta {
  priceIdMonthly: string | null;
  priceIdYearly: string | null;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  popular?: boolean;
}

// Yearly Stripe price IDs are filled in once you create the yearly
// products in Stripe. Until then yearly upgrades are disabled in the UI.
const PLAN_META: Record<Plan, PlanMeta> = {
  free:       { priceIdMonthly: null,                                priceIdYearly: null, gradient: "none",                                              badgeBg: "rgba(115,118,136,0.1)", badgeText: "#737688", accentColor: "#737688" },
  growth:     { priceIdMonthly: "price_1TBkP61MPl7fNPWeElDgBGsM",   priceIdYearly: null, gradient: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", badgeBg: "rgba(180,83,9,0.1)",    badgeText: "#b45309", accentColor: "#d97706" },
  business:   { priceIdMonthly: "price_1TBkPQ1MPl7fNPWehoGc86wl",   priceIdYearly: null, gradient: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)", badgeBg: "rgba(0,62,199,0.1)",    badgeText: "#003ec7", accentColor: "#003ec7", popular: true },
  enterprise: { priceIdMonthly: "price_1TBkPb1MPl7fNPWeD7FeszuB",   priceIdYearly: null, gradient: "linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)", badgeBg: "rgba(107,33,168,0.1)",  badgeText: "#6b21a8", accentColor: "#9333ea" },
};

interface PlanConfig { plan: Plan; price: number; price_yearly: number; features: string[]; features_en: string[]; }

type Billing = "monthly" | "yearly";

type CmpValue = boolean | string;
interface CompareRow {
  labelKey: string;
  subKey: string;
  free: CmpValue;
  growth: CmpValue;
  business: CmpValue;
  enterprise: CmpValue;
}

export default function UpgradePage() {
  const router = useRouter();
  const { tr, lang } = useLang();
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [billing, setBilling] = useState<Billing>("monthly");

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p) return;
      setCurrentPlan(p.plan);
      setIsOwner(p.userId === p.ownerId);
    });
    fetch("/api/admin/plan-config", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ plans }) => { if (plans) setPlanConfigs(plans); })
      .catch(() => {});
  }, []);

  async function handleUpgrade(priceId: string) {
    setLoading(priceId);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; } else {
        alert(data.error || "Something went wrong.");
        setLoading(null);
      }
    } catch {
      alert("Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div className="pt-8 pb-12 min-h-screen p-4 sm:p-8">
      {/* Hero */}
      <section className="max-w-7xl mx-auto mb-10 sm:mb-16 flex flex-col md:flex-row gap-8 sm:gap-12 items-end">
        <div className="flex-1">
          <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-4 block">{tr.upgrade_hero_eyebrow_full}</span>
          <h3 className="text-3xl sm:text-5xl font-bold font-headline leading-tight tracking-tight text-slate-900 dark:text-slate-100 mb-4 sm:mb-6">
            {tr.upgrade_hero_h} <span className="text-blue-600">{tr.upgrade_hero_orchestration}</span>{tr.upgrade_hero_h_end}
          </h3>
          <p className="text-base sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {tr.upgrade_hero_sub}
          </p>
        </div>
        <div className="hidden lg:block w-1/3 aspect-video rounded-2xl overflow-hidden" style={{ boxShadow: "0px 20px 40px rgba(0,62,199,0.18)" }}>
          <svg viewBox="0 0 480 270" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#001a6e" />
                <stop offset="60%" stopColor="#003ec7" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
              <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Background */}
            <rect width="480" height="270" fill="url(#bg)" />
            {/* Grid lines */}
            {[0,40,80,120,160,200,240,280,320,360,400,440,480].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="270" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1"/>
            ))}
            {[0,45,90,135,180,225,270].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1"/>
            ))}
            {/* QR corner squares — top left */}
            <rect x="30" y="30" width="54" height="54" rx="6" fill="none" stroke="#60a5fa" strokeWidth="3" strokeOpacity="0.9"/>
            <rect x="40" y="40" width="34" height="34" rx="3" fill="#60a5fa" fillOpacity="0.25"/>
            <rect x="50" y="50" width="14" height="14" rx="2" fill="#93c5fd" fillOpacity="0.9"/>
            {/* QR corner squares — top right */}
            <rect x="396" y="30" width="54" height="54" rx="6" fill="none" stroke="#a78bfa" strokeWidth="3" strokeOpacity="0.9"/>
            <rect x="406" y="40" width="34" height="34" rx="3" fill="#a78bfa" fillOpacity="0.25"/>
            <rect x="416" y="50" width="14" height="14" rx="2" fill="#c4b5fd" fillOpacity="0.9"/>
            {/* QR corner squares — bottom left */}
            <rect x="30" y="186" width="54" height="54" rx="6" fill="none" stroke="#60a5fa" strokeWidth="3" strokeOpacity="0.9"/>
            <rect x="40" y="196" width="34" height="34" rx="3" fill="#60a5fa" fillOpacity="0.25"/>
            <rect x="50" y="206" width="14" height="14" rx="2" fill="#93c5fd" fillOpacity="0.9"/>
            {/* QR data dots — center pattern */}
            {[
              [140,90],[160,90],[200,90],[220,90],[260,90],[300,90],[320,90],
              [140,110],[180,110],[240,110],[280,110],[340,110],
              [160,130],[200,130],[220,130],[300,130],[320,130],
              [140,150],[180,150],[260,150],[280,150],[340,150],
              [160,170],[200,170],[240,170],[300,170],[320,170],
            ].map(([x,y], i) => (
              <rect key={i} x={x} y={y} width="12" height="12" rx="2" fill="#bfdbfe" fillOpacity="0.55 "/>
            ))}
            {/* Glow blob center */}
            <ellipse cx="240" cy="135" rx="90" ry="60" fill="url(#glow)" />
            {/* Network nodes */}
            <circle cx="240" cy="135" r="8" fill="#ffffff" fillOpacity="0.95"/>
            <circle cx="180" cy="95" r="5" fill="#60a5fa" fillOpacity="0.9"/>
            <circle cx="300" cy="95" r="5" fill="#a78bfa" fillOpacity="0.9"/>
            <circle cx="200" cy="175" r="5" fill="#60a5fa" fillOpacity="0.9"/>
            <circle cx="290" cy="170" r="5" fill="#a78bfa" fillOpacity="0.9"/>
            {/* Connection lines */}
            <line x1="240" y1="135" x2="180" y2="95" stroke="#93c5fd" strokeWidth="1.5" strokeOpacity="0.6"/>
            <line x1="240" y1="135" x2="300" y2="95" stroke="#c4b5fd" strokeWidth="1.5" strokeOpacity="0.6"/>
            <line x1="240" y1="135" x2="200" y2="175" stroke="#93c5fd" strokeWidth="1.5" strokeOpacity="0.6"/>
            <line x1="240" y1="135" x2="290" y2="170" stroke="#c4b5fd" strokeWidth="1.5" strokeOpacity="0.6"/>
            {/* Floating ring accent */}
            <circle cx="390" cy="200" r="40" fill="none" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 6"/>
            <circle cx="390" cy="200" r="25" fill="none" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 5"/>
          </svg>
        </div>
      </section>

      {/* Monthly / Yearly toggle */}
      <div className="max-w-7xl mx-auto flex justify-center mb-8">
        <div className="inline-flex bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#242736] rounded-full p-1 shadow-sm">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${billing === "monthly" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"}`}
          >
            {tr.upgrade_billing_monthly}
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${billing === "yearly" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"}`}
          >
            {tr.upgrade_billing_yearly}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${billing === "yearly" ? "bg-white text-blue-600" : "bg-green-100 text-green-700"}`}>{tr.upgrade_billing_save}</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-y-6 items-stretch mb-24">
        {planConfigs.map((config) => {
          const meta = PLAN_META[config.plan];
          const isCurrent = config.plan === currentPlan;
          const planName = config.plan.charAt(0).toUpperCase() + config.plan.slice(1);
          const isEnterprise = config.plan === "enterprise";
          const showPrice = billing === "yearly" ? config.price_yearly : config.price;
          const perLabel = billing === "yearly" ? tr.upgrade_per_yr : tr.upgrade_per_mo;
          const activePriceId = billing === "yearly" ? meta.priceIdYearly : meta.priceIdMonthly;
          const yearlyUnavailable = billing === "yearly" && config.plan !== "free" && !meta.priceIdYearly;

          return (
            <div
              key={config.plan}
              className={`relative bg-white dark:bg-[#1a1d27] border p-8 rounded-xl flex flex-col transition-all hover:-translate-y-1 ${isCurrent ? "scale-105 z-10 border-2 border-blue-200 dark:border-blue-500/30 shadow-[0px_20px_40px_rgba(25,28,30,0.08)]" : "border-slate-200 dark:border-[#242736] hover:border-slate-300 dark:hover:border-[#2a2e3e]"}`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  {tr.upgrade_current_label}
                </div>
              )}
              <div className="mb-8">
                <h4 className={`text-lg font-bold font-headline mb-1 ${isEnterprise ? "text-purple-600" : "text-slate-900 dark:text-slate-100"}`}>{planName}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {config.plan === "free" ? tr.upgrade_for_individuals : config.plan === "growth" ? tr.upgrade_for_smb : config.plan === "business" ? tr.upgrade_for_high_vol : tr.upgrade_for_enterprise}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold font-headline ${isCurrent ? "text-blue-600" : "text-slate-900 dark:text-slate-100"}`}>CHF {showPrice}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{perLabel}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {(() => {
                  const localized = lang === "en" ? (config.features_en?.length ? config.features_en : config.features) : (config.features?.length ? config.features : config.features_en);
                  return (localized && localized.length > 0 ? localized : [tr.upgrade_no_expiry]);
                })().map((f, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm ${isCurrent ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                    <span className="material-symbols-outlined text-blue-600 text-lg" style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : {}}>check_circle</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-[#242736] text-slate-500 font-bold cursor-default opacity-60">{tr.upgrade_active_btn}</button>
              ) : config.plan === "free" ? (
                <button className="w-full py-3 px-4 rounded-xl border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">{tr.upgrade_stay_free}</button>
              ) : yearlyUnavailable ? (
                <button disabled className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-[#242736] text-slate-500 font-bold cursor-not-allowed opacity-60">{tr.upgrade_yearly_unavailable}</button>
              ) : activePriceId && isOwner ? (
                <button
                  onClick={() => handleUpgrade(activePriceId!)}
                  disabled={loading === activePriceId}
                  className="w-full py-4 px-4 rounded-xl text-white font-bold transition-all active:scale-95 shadow-md disabled:opacity-60"
                  style={{ background: isEnterprise ? "linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)" : "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
                >
                  {loading === activePriceId ? tr.upgrade_loading : tr.upgrade_now}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto mt-8 mb-12 overflow-x-auto">
        <h5 className="text-2xl sm:text-3xl font-bold font-headline text-center mb-8 sm:mb-16 text-slate-900 dark:text-slate-100">{tr.upgrade_compare_features}</h5>
        <div className="space-y-0.5 min-w-[640px]">
          <div className="grid grid-cols-6 py-4 px-6 items-center text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#242736]">
            <div className="col-span-2">{tr.upgrade_core_feature}</div>
            <div className="text-center">{tr.upgrade_plan_free}</div>
            <div className="text-center text-blue-600">{tr.upgrade_plan_growth}</div>
            <div className="text-center">{tr.upgrade_plan_business}</div>
            <div className="text-center text-purple-600">{tr.upgrade_plan_enterprise}</div>
          </div>
          {(buildCompareRows(tr) as CompareRow[]).map((row) => (
            <div key={row.labelKey} className="grid grid-cols-6 py-5 px-6 items-center hover:bg-gray-50 dark:hover:bg-[#1e2130] transition-colors rounded-xl">
              <div className="col-span-2">
                <p className="font-bold text-slate-900 dark:text-slate-100">{tr[row.labelKey as keyof typeof tr] as string}</p>
                {row.subKey && <p className="text-xs text-slate-400 mt-0.5">{tr[row.subKey as keyof typeof tr] as string}</p>}
              </div>
              {(["free", "growth", "business", "enterprise"] as Plan[]).map((p) => {
                const val = row[p];
                const isHighlight = p === "growth" || p === "enterprise";
                return (
                  <div key={p} className="flex justify-center">
                    {typeof val === "boolean" ? (
                      val
                        ? <span className={`material-symbols-outlined ${p === "enterprise" ? "text-purple-600" : "text-blue-600"}`}>check</span>
                        : <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">close</span>
                    ) : (
                      <span className={`text-sm font-medium text-center ${isHighlight ? `font-bold ${p === "enterprise" ? "text-purple-600" : "text-blue-600"}` : "text-slate-700 dark:text-slate-300"}`}>{val}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildCompareRows(tr: ReturnType<typeof useLang>["tr"]): CompareRow[] {
  return [
    { labelKey: "cmp_qr_codes",       subKey: "cmp_qr_codes_sub",       free: "1",  growth: "10",          business: "100",                 enterprise: tr.cmp_unlimited },
    { labelKey: "cmp_team_members",   subKey: "cmp_team_members_sub",   free: "1",  growth: "3",           business: "10",                  enterprise: tr.cmp_unlimited },
    { labelKey: "cmp_dynamic_qr",     subKey: "cmp_dynamic_qr_sub",     free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_custom_design",  subKey: "cmp_custom_design_sub",  free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_lead_capture",   subKey: "cmp_lead_capture_sub",   free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_analytics",      subKey: "cmp_analytics_sub",      free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_folders",        subKey: "cmp_folders_sub",        free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_bilingual",      subKey: "cmp_bilingual_sub",      free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_csv_export",     subKey: "cmp_csv_export_sub",     free: true, growth: true,          business: true,                  enterprise: true },
    { labelKey: "cmp_templates",      subKey: "cmp_templates_sub",      free: false, growth: true,         business: true,                  enterprise: true },
    { labelKey: "cmp_custom_domain",  subKey: "cmp_custom_domain_sub",  free: false, growth: false,        business: true,                  enterprise: true },
    { labelKey: "cmp_webhook",        subKey: "cmp_webhook_sub",        free: false, growth: false,        business: true,                  enterprise: true },
    { labelKey: "cmp_support",        subKey: "cmp_support_sub",        free: tr.cmp_support_community, growth: tr.cmp_support_email, business: tr.cmp_support_priority, enterprise: tr.cmp_support_dedicated },
  ];
}
