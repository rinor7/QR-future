"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, HelpCircle, Calendar } from "lucide-react";
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
  free:     { priceId: null,                               gradient: "none",                                              badgeBg: "rgba(115,118,136,0.1)", badgeText: "#737688", accentColor: "#737688" },
  star:     { priceId: "price_1TBkP61MPl7fNPWeElDgBGsM",  gradient: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", badgeBg: "rgba(180,83,9,0.1)",    badgeText: "#b45309", accentColor: "#d97706" },
  premium:  { priceId: "price_1TBkPQ1MPl7fNPWehoGc86wl",  gradient: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)", badgeBg: "rgba(0,62,199,0.1)",    badgeText: "#003ec7", accentColor: "#003ec7", popular: true },
  platinum: { priceId: "price_1TBkPb1MPl7fNPWeD7FeszuB",  gradient: "linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)", badgeBg: "rgba(107,33,168,0.1)",  badgeText: "#6b21a8", accentColor: "#9333ea" },
};

interface PlanConfig { plan: Plan; price: number; features: string[]; }

const COMPARE_ROWS = [
  { label: "QR Code Lifetime", free: "30 Days", star: "1 Year", premium: "Unlimited", platinum: "Unlimited" },
  { label: "Dedicated QR Codes", free: false, star: true, premium: true, platinum: true },
  { label: "Analytics", free: false, star: false, premium: true, platinum: true },
  { label: "API Webhooks", free: false, star: false, premium: true, platinum: true },
  { label: "White-label Domains", free: false, star: false, premium: false, platinum: true },
];

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
    <div className="p-4 wide:p-8 max-w-5xl">
      {/* Hero section */}
      <div className="rounded-2xl overflow-hidden mb-8 flex items-center justify-between gap-6 px-8 py-8 relative"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #001a6e 60%, #003ec7 100%)", minHeight: "180px" }}>
        <div className="relative z-10 max-w-lg">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Subscription Management</p>
          <h1 className="font-headline font-bold text-white leading-tight mb-3" style={{ fontSize: "2rem", fontStyle: "italic" }}>
            Elevate your<br /><span style={{ color: "#60a5fa" }}>orchestration</span><br />experience.
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Scale your enterprise QR infrastructure with surgical precision. Choose a tier that matches your global footprint and security requirements.
          </p>
        </div>
        {/* Abstract decoration */}
        <div className="hidden md:block shrink-0 w-40 h-32 rounded-2xl opacity-20" style={{ background: "linear-gradient(135deg, #0052ff 0%, #9333ea 100%)", filter: "blur(2px)" }} />
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 opacity-30">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-2 h-2 rounded-full bg-white" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {planConfigs.map((config) => {
          const meta = PLAN_META[config.plan];
          const isCurrent = config.plan === currentPlan;
          const planName = config.plan.charAt(0).toUpperCase() + config.plan.slice(1);
          return (
            <div
              key={config.plan}
              className="bg-brand-surface rounded-2xl p-5 flex flex-col relative shadow-ambient-sm"
              style={{ border: isCurrent ? "2px solid #003ec7" : "1px solid rgba(195,197,217,0.4)" }}
            >
              {meta.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
                  Most Popular
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: meta.badgeBg, color: meta.badgeText }}>
                  {planName}
                </span>
                {isCurrent && <span className="text-xs text-brand-primary font-semibold">{tr.upgrade_current}</span>}
              </div>

              <div className="mb-4">
                <span className="font-headline text-3xl font-bold text-brand-text">CHF {config.price}</span>
                <span className="text-brand-outline text-xs ml-1">{tr.upgrade_per_month}</span>
              </div>

              <ul className="space-y-2 mb-5 flex-1">
                {(config.features.length > 0 ? config.features : [tr.upgrade_no_expiry]).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-brand-text-secondary">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.badgeBg }}>
                      <Check className="w-2.5 h-2.5" style={{ color: meta.accentColor }} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {meta.priceId && !isCurrent && isOwner ? (
                <button
                  onClick={() => handleUpgrade(meta.priceId!)}
                  disabled={loading === meta.priceId}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-60 hover:opacity-90"
                  style={{ background: meta.gradient !== "none" ? meta.gradient : "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
                >
                  {loading === meta.priceId ? tr.upgrade_loading : "Upgrade Now"}
                </button>
              ) : isCurrent ? (
                <div className="w-full text-center text-sm text-brand-outline py-2">{tr.upgrade_current_plan}</div>
              ) : meta.priceId === null && !isCurrent ? (
                <button className="w-full py-2.5 rounded-xl font-semibold text-sm text-brand-text-secondary hover:bg-brand-surface-low transition-colors" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
                  Stay on Free
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Compare capabilities table */}
      <div className="bg-brand-surface rounded-2xl overflow-hidden shadow-ambient-sm mb-6" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(195,197,217,0.35)" }}>
          <h2 className="font-headline font-semibold text-brand-text">Compare full capabilities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(195,197,217,0.25)", background: "#f7f9fb" }}>
                <th className="text-left px-6 py-3 text-xs font-semibold text-brand-outline uppercase tracking-wide">Core Feature</th>
                {(["free", "star", "premium", "platinum"] as Plan[]).map((p) => (
                  <th key={p} className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wide"
                    style={{ color: PLAN_META[p].badgeText }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, idx) => (
                <tr key={row.label} style={{ borderBottom: idx < COMPARE_ROWS.length - 1 ? "1px solid rgba(195,197,217,0.2)" : "none" }} className="hover:bg-brand-bg transition-colors">
                  <td className="px-6 py-3 text-sm text-brand-text-secondary">{row.label}</td>
                  {(["free", "star", "premium", "platinum"] as Plan[]).map((p) => {
                    const val = row[p as keyof typeof row];
                    return (
                      <td key={p} className="px-6 py-3 text-center">
                        {typeof val === "boolean" ? (
                          val
                            ? <Check className="w-4 h-4 mx-auto" style={{ color: PLAN_META[p].accentColor }} />
                            : <Minus className="w-4 h-4 mx-auto text-brand-outline-variant" />
                        ) : (
                          <span className="text-xs font-medium text-brand-text-secondary">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ border: "1px solid rgba(195,197,217,0.35)", background: "rgba(0,62,199,0.03)" }}>
        <div>
          <h3 className="font-headline font-semibold text-brand-text">Unsure which plan fits your scale?</h3>
          <p className="text-sm text-brand-outline mt-1">Our solution architects can provide a capabilities audit of your current QR volume and project future scaling needs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary px-4 py-2.5 rounded-xl hover:bg-brand-surface-low transition-colors" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
            <HelpCircle className="w-4 h-4" />
            View FAQ
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Schedule a Demo
          </button>
        </div>
      </div>
    </div>
  );
}
