"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";
import { Plan, PLAN_LABELS } from "@/lib/types";

const PLAN_COLORS: Record<Plan, string> = {
  free: "border-gray-200 bg-gray-50",
  star: "border-yellow-300 bg-yellow-50",
  premium: "border-blue-300 bg-blue-50",
  platinum: "border-purple-300 bg-purple-50",
};

const PLAN_BADGES: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600",
  star: "bg-yellow-100 text-yellow-700",
  premium: "bg-blue-100 text-blue-700",
  platinum: "bg-purple-100 text-purple-700",
};

interface PlanConfig {
  plan: Plan;
  price: number;
  features: string[];
}

export default function PlanSettingsPage() {
  const { tr } = useLang();
  const router = useRouter();
  const [configs, setConfigs] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Plan | null>(null);
  const [saved, setSaved] = useState<Plan | null>(null);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p?.isPlatformAdmin) { router.replace("/dashboard/clients"); return; }
    });
    fetch("/api/admin/plan-config")
      .then((r) => r.json())
      .then(({ plans }) => { if (plans) setConfigs(plans); })
      .finally(() => setLoading(false));
  }, [router]);

  function setPrice(plan: Plan, value: string) {
    setConfigs((prev) => prev.map((c) => c.plan === plan ? { ...c, price: parseFloat(value) || 0 } : c));
  }

  function setFeature(plan: Plan, index: number, value: string) {
    setConfigs((prev) => prev.map((c) => {
      if (c.plan !== plan) return c;
      const features = [...c.features];
      features[index] = value;
      return { ...c, features };
    }));
  }

  function addFeature(plan: Plan) {
    setConfigs((prev) => prev.map((c) => {
      if (c.plan !== plan || c.features.length >= 4) return c;
      return { ...c, features: [...c.features, ""] };
    }));
  }

  function removeFeature(plan: Plan, index: number) {
    setConfigs((prev) => prev.map((c) => {
      if (c.plan !== plan) return c;
      const features = c.features.filter((_, i) => i !== index);
      return { ...c, features };
    }));
  }

  async function savePlan(config: PlanConfig) {
    setSaving(config.plan);
    await fetch("/api/admin/plan-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: config.plan, price: config.price, features: config.features.filter(Boolean) }),
    });
    setSaving(null);
    setSaved(config.plan);
    setTimeout(() => setSaved(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tr.plan_settings_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.plan_settings_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => (
          <div key={config.plan} className={`rounded-2xl border-2 p-5 flex flex-col gap-4 ${PLAN_COLORS[config.plan]}`}>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${PLAN_BADGES[config.plan]}`}>
              {PLAN_LABELS[config.plan]}
            </span>

            {/* Price */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{tr.plan_settings_price}</label>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-sm text-gray-400">CHF</span>
                <input
                  type="number"
                  min="0"
                  value={config.price}
                  onChange={(e) => setPrice(config.plan, e.target.value)}
                  disabled={config.plan === "free"}
                  className="flex-1 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none disabled:text-gray-400 w-full"
                />
              </div>
            </div>

            {/* Features */}
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-2 block">{tr.plan_settings_features}</label>
              <div className="space-y-2">
                {config.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <input
                      type="text"
                      value={f}
                      onChange={(e) => setFeature(config.plan, i, e.target.value)}
                      placeholder={tr.plan_settings_feature_placeholder}
                      className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => removeFeature(config.plan, i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {config.features.length < 4 && (
                  <button
                    onClick={() => addFeature(config.plan)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add feature
                  </button>
                )}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={() => savePlan(config)}
              disabled={saving === config.plan}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saved === config.plan ? (
                <><Check className="w-4 h-4" /> {tr.plan_settings_saved}</>
              ) : saving === config.plan ? "..." : tr.plan_settings_save}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
