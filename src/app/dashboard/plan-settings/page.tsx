"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, X } from "lucide-react";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";
import { Plan, PLAN_LABELS } from "@/lib/types";

const MAX_FEATURES = 4;

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
  const [editing, setEditing] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<PlanConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Plan | null>(null);
  const [stripeWarning, setStripeWarning] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p?.isPlatformAdmin) { router.replace("/dashboard/clients"); return; }
    });
    fetch("/api/admin/plan-config")
      .then((r) => r.json())
      .then(({ plans }) => {
        if (plans) {
          // Enforce max features on load
          setConfigs(plans.map((p: PlanConfig) => ({ ...p, features: p.features.slice(0, MAX_FEATURES) })));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function startEdit(config: PlanConfig) {
    setEditing(config.plan);
    setDraft({ ...config, features: [...config.features] });
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  function setDraftPrice(value: string) {
    if (!draft) return;
    setDraft({ ...draft, price: parseFloat(value) || 0 });
  }

  function setDraftFeature(index: number, value: string) {
    if (!draft) return;
    const features = [...draft.features];
    features[index] = value;
    setDraft({ ...draft, features });
  }

  function addDraftFeature() {
    if (!draft || draft.features.length >= MAX_FEATURES) return;
    setDraft({ ...draft, features: [...draft.features, ""] });
  }

  function removeDraftFeature(index: number) {
    if (!draft) return;
    setDraft({ ...draft, features: draft.features.filter((_, i) => i !== index) });
  }

  function requestSave() {
    if (!draft) return;
    // Warn about Stripe for paid plans
    if (draft.plan !== "free") {
      setStripeWarning(true);
    } else {
      doSave();
    }
  }

  async function doSave() {
    if (!draft) return;
    setStripeWarning(false);
    setSaving(true);
    await fetch("/api/admin/plan-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: draft.plan, price: draft.price, features: draft.features.filter(Boolean) }),
    });
    setConfigs((prev) => prev.map((c) => c.plan === draft.plan ? { ...draft, features: draft.features.filter(Boolean) } : c));
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
        <h1 className="text-2xl font-bold text-gray-900">{tr.plan_settings_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.plan_settings_subtitle}</p>
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

              {/* Price */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{tr.plan_settings_price}</label>
                <div className={`flex items-center gap-1 bg-white border rounded-xl px-3 py-2 ${isEditing ? "border-blue-300" : "border-gray-200"}`}>
                  <span className="text-sm text-gray-400">CHF</span>
                  <input
                    type="number"
                    min="0"
                    value={current.price}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    disabled={!isEditing || config.plan === "free"}
                    className="flex-1 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none disabled:text-gray-400 w-full"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  {tr.plan_settings_features} ({current.features.filter(Boolean).length}/{MAX_FEATURES})
                </label>
                <div className="space-y-2">
                  {isEditing ? (
                    <>
                      {(draft?.features ?? []).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <input
                            type="text"
                            value={f}
                            onChange={(e) => setDraftFeature(i, e.target.value)}
                            placeholder={tr.plan_settings_feature_placeholder}
                            className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => removeDraftFeature(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(draft?.features.length ?? 0) < MAX_FEATURES && (
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
                        <span className="text-xs text-gray-700">{f}</span>
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
                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-medium hover:bg-white transition-colors"
                  >
                    {tr.plan_settings_cancel}
                  </button>
                  <button
                    onClick={requestSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 rounded-xl text-xs font-medium transition-colors"
                  >
                    {saving ? "..." : tr.plan_settings_save}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(config)}
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2 rounded-xl text-xs font-medium transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {tr.plan_settings_edit}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Stripe warning modal */}
      {stripeWarning && draft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Stripe aktualisieren?</h2>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {tr.plan_settings_stripe_warning}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStripeWarning(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {tr.plan_settings_cancel}
              </button>
              <button
                onClick={doSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {tr.plan_settings_stripe_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
