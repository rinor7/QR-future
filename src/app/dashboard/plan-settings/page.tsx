"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, X } from "lucide-react";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";
import { Plan, PLAN_LABELS } from "@/lib/types";

const MAX_FEATURES = 4;

const PLAN_COLORS: Record<Plan, string> = {
  free: "border-gray-200 dark:border-[#242736] bg-gray-50 dark:bg-[#1a1d27]",
  growth: "border-yellow-300 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/10",
  business: "border-blue-300 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/10",
  enterprise: "border-purple-300 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/10",
};

const PLAN_BADGES: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  growth: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  business: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

interface PlanConfig {
  plan: Plan;
  price: number;
  price_yearly: number;
  features: string[];     // German
  features_en: string[];  // English
}

export default function PlanSettingsPage() {
  const { tr } = useLang();
  const router = useRouter();
  const [configs, setConfigs] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Plan | null>(null);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p?.isPlatformAdmin) { router.replace("/dashboard/clients"); return; }
    });
    fetch("/api/admin/plan-config", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ plans }) => {
        if (plans) {
          setConfigs(plans.map((p: PlanConfig) => ({
            ...p,
            price_yearly: p.price_yearly ?? 0,
            features: (p.features ?? []).slice(0, MAX_FEATURES),
            features_en: (p.features_en ?? p.features ?? []).slice(0, MAX_FEATURES),
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function startEdit(config: PlanConfig) {
    setEditing(config.plan);
    setDraft({ ...config, features: [...config.features], features_en: [...config.features_en] });
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  function setDraftFeature(lang: "de" | "en", index: number, value: string) {
    if (!draft) return;
    const key = lang === "de" ? "features" : "features_en";
    const next = [...draft[key]];
    next[index] = value;
    setDraft({ ...draft, [key]: next });
  }

  function addDraftFeature() {
    if (!draft) return;
    const len = Math.max(draft.features.length, draft.features_en.length);
    if (len >= MAX_FEATURES) return;
    setDraft({ ...draft, features: [...draft.features, ""], features_en: [...draft.features_en, ""] });
  }

  function removeDraftFeature(index: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      features: draft.features.filter((_, i) => i !== index),
      features_en: draft.features_en.filter((_, i) => i !== index),
    });
  }

  async function doSave() {
    if (!draft) return;
    setSaving(true);
    const features = draft.features.filter(Boolean);
    const features_en = draft.features_en.filter(Boolean);
    // Prices are intentionally not editable from the admin UI — they live in
    // Stripe + plan_config seed and stay in sync via the SQL migration.
    await fetch("/api/admin/plan-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: draft.plan, price: draft.price, price_yearly: draft.price_yearly, features, features_en }),
    });
    setConfigs((prev) => prev.map((c) => c.plan === draft.plan ? { ...draft, features, features_en } : c));
    setSaving(false);
    setSaved(draft.plan);
    setEditing(null);
    setDraft(null);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{tr.plan_settings_title}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{tr.plan_settings_subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => {
          const isEditing = editing === config.plan;
          const current = isEditing && draft ? draft : config;

          return (
            <div key={config.plan} className={`rounded-2xl border-2 p-5 flex flex-col gap-4 ${PLAN_COLORS[config.plan]}`}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_BADGES[config.plan]}`}>
                  {PLAN_LABELS[config.plan]}
                </span>
                {saved === config.plan && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> {tr.plan_settings_saved}
                  </span>
                )}
              </div>

              {/* Prices — read-only (managed in Stripe + SQL seed) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">{tr.plan_settings_price_monthly}</label>
                  <div className="flex items-baseline gap-1 bg-gray-50 dark:bg-[#1a1d27] border border-gray-200 dark:border-[#242736] rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-400 dark:text-slate-500">CHF</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{current.price}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">{tr.plan_settings_price_yearly}</label>
                  <div className="flex items-baseline gap-1 bg-gray-50 dark:bg-[#1a1d27] border border-gray-200 dark:border-[#242736] rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-400 dark:text-slate-500">CHF</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{current.price_yearly}</span>
                  </div>
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-gray-400 dark:text-slate-500 italic">{tr.plan_settings_price_locked}</p>

              {/* Features */}
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2 block">
                  {tr.plan_settings_features} ({current.features.filter(Boolean).length}/{MAX_FEATURES})
                </label>
                <div className="space-y-2">
                  {isEditing ? (
                    <>
                      {Array.from({ length: Math.max(draft?.features.length ?? 0, draft?.features_en.length ?? 0) }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-gray-400 w-5">DE</span>
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            <input
                              type="text"
                              value={draft?.features[i] ?? ""}
                              onChange={(e) => setDraftFeature("de", i, e.target.value)}
                              placeholder="z.B. Unbegrenzte QR Codes"
                              className="flex-1 text-xs bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#242736] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => removeDraftFeature(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-gray-400 w-5">EN</span>
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0 opacity-0" />
                            <input
                              type="text"
                              value={draft?.features_en[i] ?? ""}
                              onChange={(e) => setDraftFeature("en", i, e.target.value)}
                              placeholder="e.g. Unlimited QR codes"
                              className="flex-1 text-xs bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-[#242736] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ))}
                      {Math.max(draft?.features.length ?? 0, draft?.features_en.length ?? 0) < MAX_FEATURES && (
                        <button
                          onClick={addDraftFeature}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {tr.plan_settings_features}
                        </button>
                      )}
                    </>
                  ) : (
                    config.features.filter(Boolean).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-xs text-gray-700 dark:text-slate-300">{f}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 border border-gray-200 dark:border-[#242736] text-gray-600 dark:text-slate-300 py-2 rounded-xl text-xs font-medium hover:bg-white dark:hover:bg-[#242736] transition-colors"
                  >
                    {tr.plan_settings_cancel}
                  </button>
                  <button
                    onClick={doSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-xl text-xs font-medium transition-colors"
                  >
                    {saving ? "..." : tr.plan_settings_save}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(config)}
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-300 dark:border-[#242736] bg-white dark:bg-[#1a1d27] hover:bg-gray-50 dark:hover:bg-[#242736] text-gray-700 dark:text-slate-300 py-2 rounded-xl text-xs font-medium transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {tr.plan_settings_edit}
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
