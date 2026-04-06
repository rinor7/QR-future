"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan } from "@/lib/types";
import { useLang } from "@/lib/language";

interface PlanMeta {
  priceId: string | null;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  popular?: boolean;
}

const PLAN_META: Record<Plan, PlanMeta> = {
  free:     { priceId: null,                               gradient: "none",                                              badgeBg: "rgba(115,118,136,0.1)", badgeText: "#737688",  accentColor: "#737688" },
  star:     { priceId: "price_1TBkP61MPl7fNPWeElDgBGsM",  gradient: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", badgeBg: "rgba(180,83,9,0.1)",    badgeText: "#b45309",  accentColor: "#d97706" },
  premium:  { priceId: "price_1TBkPQ1MPl7fNPWehoGc86wl",  gradient: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)", badgeBg: "rgba(0,62,199,0.1)",    badgeText: "#003ec7",  accentColor: "#003ec7", popular: true },
  platinum: { priceId: "price_1TBkPb1MPl7fNPWeD7FeszuB",  gradient: "linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)", badgeBg: "rgba(107,33,168,0.1)",  badgeText: "#6b21a8",  accentColor: "#9333ea" },
};

interface PlanConfig { plan: Plan; price: number; features: string[]; }

export default function UpgradePage() {
  const router = useRouter();
  const { tr } = useLang();
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p) return;
      setCurrentPlan(p.plan);
      setIsOwner(p.userId === p.ownerId);
    });
    fetch("/api/admin/plan-config")
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
        setLoading(null);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="p-4 wide:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-brand-text">{tr.upgrade_title}</h1>
        <p className="text-brand-outline mt-1">{tr.upgrade_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planConfigs.map((config) => {
          const meta = PLAN_META[config.plan];
          const isCurrent = config.plan === currentPlan;
          const planName = config.plan.charAt(0).toUpperCase() + config.plan.slice(1);
          const isPremium = meta.popular;
          return (
            <div
              key={config.plan}
              className={`bg-brand-surface rounded-2xl p-6 flex flex-col transition-shadow hover:shadow-ambient-md shadow-ambient-sm relative ${isCurrent ? "ring-2 ring-brand-primary" : ""}`}
              style={{ border: isCurrent ? "none" : "1px solid rgba(195,197,217,0.4)" }}
            >
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
                  Beliebt
                </div>
              )}

              <div className="mb-4">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: meta.badgeBg, color: meta.badgeText }}>
                  {planName}
                </span>
                {isCurrent && (
                  <span className="ml-2 text-xs text-brand-primary font-medium">{tr.upgrade_current}</span>
                )}
              </div>

              <div className="mb-5">
                <span className="font-headline text-3xl font-bold text-brand-text">CHF {config.price}</span>
                <span className="text-brand-outline text-sm ml-1">{tr.upgrade_per_month}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {config.features.length > 0 ? config.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-text-secondary">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.badgeBg }}>
                      <Check className="w-2.5 h-2.5" style={{ color: meta.accentColor }} />
                    </span>
                    {f}
                  </li>
                )) : (
                  <li className="flex items-start gap-2 text-sm text-brand-text-secondary">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.badgeBg }}>
                      <Check className="w-2.5 h-2.5" style={{ color: meta.accentColor }} />
                    </span>
                    {tr.upgrade_no_expiry}
                  </li>
                )}
              </ul>

              {meta.priceId && !isCurrent && isOwner && (
                <button
                  onClick={() => handleUpgrade(meta.priceId!)}
                  disabled={loading === meta.priceId}
                  className="w-full py-2.5 rounded-xl font-medium text-sm text-white transition-opacity disabled:opacity-60 hover:opacity-90"
                  style={{ background: meta.gradient !== "none" ? meta.gradient : "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
                >
                  {loading === meta.priceId ? tr.upgrade_loading : `${planName} ${tr.upgrade_select}`}
                </button>
              )}
              {isCurrent && (
                <div className="w-full text-center text-sm text-brand-outline py-2.5">
                  {tr.upgrade_current_plan}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
