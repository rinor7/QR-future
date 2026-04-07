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
    <div className="pt-8 pb-12 min-h-screen bg-surface p-8">
      {/* Hero */}
      <section className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row gap-12 items-end">
        <div className="flex-1">
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-4 block">Subscription Management</span>
          <h3 className="text-5xl font-bold font-headline leading-tight tracking-tight text-on-surface mb-6">
            Elevate your <span className="text-primary">orchestration</span> experience.
          </h3>
          <p className="text-xl text-on-surface-variant max-w-2xl leading-relaxed">
            Scale your enterprise QR infrastructure with surgical precision. Choose a tier that matches your global footprint and security requirements.
          </p>
        </div>
        <div className="hidden lg:block w-1/3 aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary-container opacity-80" style={{ boxShadow: "0px 20px 40px rgba(25,28,30,0.06)" }} />
      </section>

      {/* Plan cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-24">
        {planConfigs.map((config) => {
          const meta = PLAN_META[config.plan];
          const isCurrent = config.plan === currentPlan;
          const planName = config.plan.charAt(0).toUpperCase() + config.plan.slice(1);
          const isPremium = config.plan === "premium";
          const isPlatinum = config.plan === "platinum";

          return (
            <div
              key={config.plan}
              className={`relative bg-surface-container-low p-8 rounded-xl flex flex-col transition-all hover:-translate-y-1 ${isCurrent ? "scale-105 z-10 border-2 border-primary/20 bg-surface-container-lowest shadow-[0px_20px_40px_rgba(25,28,30,0.06)]" : "hover:bg-surface-container-high"}`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  Current Plan
                </div>
              )}
              <div className="mb-8">
                <h4 className={`text-lg font-bold font-headline mb-1 ${isPlatinum ? "text-tertiary" : "text-on-surface"}`}>{planName}</h4>
                <p className="text-sm text-on-surface-variant mb-6">
                  {config.plan === "free" ? "For individual experimenters." : config.plan === "star" ? "Perfect for small businesses." : config.plan === "premium" ? "High-volume orchestration." : "Ultimate enterprise control."}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold font-headline ${isCurrent ? "text-primary" : "text-on-surface"}`}>CHF {config.price}</span>
                  <span className="text-on-surface-variant text-sm font-medium">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {(config.features.length > 0 ? config.features : [tr.upgrade_no_expiry]).map((f, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm ${isCurrent ? "font-semibold" : "text-on-surface-variant"}`}>
                    <span className={`material-symbols-outlined text-primary text-lg ${isCurrent ? "text-primary" : ""}`} style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : {}}>check_circle</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="w-full py-3 px-4 rounded-xl bg-surface-container-high text-on-surface-variant font-bold cursor-default opacity-50">Active</button>
              ) : config.plan === "free" ? (
                <button className="w-full py-3 px-4 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors">Stay on Free</button>
              ) : isPlatinum ? (
                <button className="w-full py-3 px-4 rounded-xl border-2 border-tertiary text-tertiary font-bold hover:bg-tertiary/5 transition-colors">Contact Sales</button>
              ) : meta.priceId && isOwner ? (
                <button
                  onClick={() => handleUpgrade(meta.priceId!)}
                  disabled={loading === meta.priceId}
                  className="w-full py-4 px-4 rounded-xl text-white font-bold transition-all active:scale-95 shadow-md disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}
                >
                  {loading === meta.priceId ? tr.upgrade_loading : "Upgrade Now"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto mt-8 mb-32">
        <h5 className="text-3xl font-bold font-headline text-center mb-16">Compare full capabilities</h5>
        <div className="space-y-0.5">
          <div className="grid grid-cols-5 py-4 px-6 items-center text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
            <div className="col-span-2">Core Feature</div>
            <div className="text-center">Free</div>
            <div className="text-center text-primary">Star</div>
            <div className="text-center">Premium</div>
          </div>
          {COMPARE_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-5 py-6 px-6 items-center hover:bg-surface-container-low transition-colors rounded-xl">
              <div className="col-span-2">
                <p className="font-bold text-on-surface">{row.label}</p>
              </div>
              {(["free", "star", "premium"] as Plan[]).map((p) => {
                const val = row[p as keyof typeof row];
                return (
                  <div key={p} className="flex justify-center">
                    {typeof val === "boolean" ? (
                      val
                        ? <span className="material-symbols-outlined text-primary">check</span>
                        : <span className="material-symbols-outlined text-outline-variant">close</span>
                    ) : (
                      <span className={`text-sm font-medium ${p === "star" ? "font-bold text-primary" : ""}`}>{val as string}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* CTA glass panel */}
      <div className="max-w-7xl mx-auto glass-panel p-12 rounded-3xl border border-white flex flex-col md:flex-row items-center justify-between gap-8 mb-12 overflow-hidden relative" style={{ boxShadow: "0px 20px 40px rgba(25,28,30,0.06)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 max-w-lg">
          <h6 className="text-2xl font-bold font-headline mb-4">Unsure which plan fits your scale?</h6>
          <p className="text-on-surface-variant">Our solution architects can provide a customized audit of your current QR volume and predict future scaling needs.</p>
        </div>
        <div className="relative z-10 flex gap-4">
          <button className="bg-surface-container-high px-8 py-4 rounded-xl font-bold hover:bg-surface-container-highest transition-colors">View FAQ</button>
          <button className="text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>Schedule a Demo</button>
        </div>
      </div>
    </div>
  );
}
