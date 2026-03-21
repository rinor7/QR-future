"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan } from "@/lib/types";
import { useLang } from "@/lib/language";

const PLANS = [
  {
    id: "free" as Plan,
    name: "Free",
    price: "0",
    limit: "1 QR Code",
    priceId: null,
    color: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
  },
  {
    id: "star" as Plan,
    name: "Star",
    price: "20",
    limit: "10 QR Codes",
    priceId: "price_1TBkP61MPl7fNPWeElDgBGsM",
    color: "border-yellow-300",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "premium" as Plan,
    name: "Premium",
    price: "60",
    limit: "100 QR Codes",
    priceId: "price_1TBkPQ1MPl7fNPWehoGc86wl",
    color: "border-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "platinum" as Plan,
    name: "Platinum",
    price: "200",
    limit: null, // uses tr.upgrade_unlimited
    priceId: "price_1TBkPb1MPl7fNPWeD7FeszuB",
    color: "border-purple-400",
    badge: "bg-purple-100 text-purple-700",
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const { tr } = useLang();
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p) return;
      setCurrentPlan(p.plan);
      setIsOwner(p.userId === p.ownerId);
    });
  }, []);

  async function handleUpgrade(priceId: string) {
    setLoading(priceId);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, userId: user.id, userEmail: user.email }),
    });

    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(null);
  }

  return (
    <div className="p-4 wide:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.upgrade_title}</h1>
        <p className="text-gray-500 mt-1">{tr.upgrade_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${plan.color} ${isCurrent ? "ring-2 ring-blue-500" : ""}`}
            >
              <div className="mb-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badge}`}>
                  {plan.name}
                </span>
                {isCurrent && (
                  <span className="ml-2 text-xs text-blue-600 font-medium">{tr.upgrade_current}</span>
                )}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">CHF {plan.price}</span>
                <span className="text-gray-400 text-sm">{tr.upgrade_per_month}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {plan.limit ?? tr.upgrade_unlimited}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {tr.upgrade_no_expiry}
                </li>
              </ul>

              {plan.priceId && !isCurrent && isOwner && (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={loading === plan.priceId}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors text-sm"
                >
                  {loading === plan.priceId ? tr.upgrade_loading : `${plan.name} ${tr.upgrade_select}`}
                </button>
              )}
              {isCurrent && (
                <div className="w-full text-center text-sm text-gray-400 py-2.5">
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
