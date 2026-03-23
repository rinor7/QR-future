"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { getUserProfile } from "@/lib/store";
import { ClientAccount, Plan, PLAN_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Users, AlertTriangle, ArrowRight, Eye } from "lucide-react";

const PLAN_COLORS: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600",
  star: "bg-yellow-100 text-yellow-700",
  premium: "bg-blue-100 text-blue-700",
  platinum: "bg-purple-100 text-purple-700",
};

export default function ClientsPage() {
  const { tr } = useLang();
  const router = useRouter();

  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ userId: string; email: string; from: Plan; to: Plan } | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p?.isPlatformAdmin) {
        router.replace("/dashboard");
        return;
      }
      load();
    });
  }, [router]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const { clients } = await res.json();
      setClients(clients ?? []);
    } finally {
      setLoading(false);
    }
  }

  function requestPlanChange(userId: string, newPlan: Plan) {
    const client = clients.find((c) => c.userId === userId);
    if (!client || client.plan === newPlan) return;
    setPendingPlan({ userId, email: client.email, from: client.plan, to: newPlan });
  }

  async function confirmPlanChange() {
    if (!pendingPlan) return;
    setChangingPlan(true);
    await fetch("/api/admin/clients/update-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: pendingPlan.userId, plan: pendingPlan.to }),
    });
    setClients((prev) => prev.map((c) => c.userId === pendingPlan.userId ? { ...c, plan: pendingPlan.to } : c));
    setChangingPlan(false);
    setPendingPlan(null);
  }

  async function handleDelete(userId: string) {
    if (removingId === userId) {
      await fetch("/api/admin/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setClients((prev) => prev.filter((c) => c.userId !== userId));
      setRemovingId(null);
    } else {
      setRemovingId(userId);
      setTimeout(() => setRemovingId(null), 3000);
    }
  }

  const INACTIVITY_DAYS = 1;
  const inactiveClients = clients.filter((c) => {
    if (!c.lastActivityAt) return true; // never had activity
    const daysSince = (Date.now() - new Date(c.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > INACTIVITY_DAYS;
  });

  // Stats
  const planCounts = clients.reduce<Record<Plan, number>>(
    (acc, c) => { acc[c.plan] = (acc[c.plan] ?? 0) + 1; return acc; },
    { free: 0, star: 0, premium: 0, platinum: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tr.clients_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.clients_subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-1">{tr.clients_stat_total}</p>
        </div>
        {(["free", "star", "premium", "platinum"] as Plan[]).map((plan) => (
          <div key={plan} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{planCounts[plan]}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${PLAN_COLORS[plan]}`}>
              {PLAN_LABELS[plan]}
            </span>
          </div>
        ))}
      </div>

      {/* Inactivity notification */}
      {inactiveClients.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-semibold text-amber-800">{tr.clients_inactive_title} ({inactiveClients.length})</h2>
          </div>
          <p className="text-xs text-amber-700 mb-4">{tr.clients_inactive_body}</p>
          <div className="flex flex-col gap-2">
            {inactiveClients.map((c) => (
              <div key={c.userId} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800 font-medium">{c.email}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {c.lastActivityAt
                    ? `${tr.clients_last_active}: ${new Date(c.lastActivityAt).toLocaleDateString()}`
                    : tr.clients_never_active}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-6 py-3">Email</th>
              <th className="text-left px-6 py-3">Plan</th>
              <th className="text-left px-6 py-3">{tr.clients_col_qr}</th>
              <th className="text-left px-6 py-3">{tr.clients_col_joined}</th>
              <th className="px-6 py-3" />
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {tr.clients_no_clients}
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  {/* Avatar + email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.email[0].toUpperCase()}
                      </div>
                      <span className="text-gray-800 font-medium">{c.email}</span>
                    </div>
                  </td>
                  {/* Plan dropdown */}
                  <td className="px-6 py-4">
                    {c.hasStripe ? (
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg w-fit ${PLAN_COLORS[c.plan]}`}>
                          {PLAN_LABELS[c.plan]}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          Stripe
                        </span>
                      </div>
                    ) : (
                      <select
                        value={c.plan}
                        onChange={(e) => requestPlanChange(c.userId, e.target.value as Plan)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${PLAN_COLORS[c.plan]}`}
                      >
                        {(["free", "star", "premium", "platinum"] as Plan[]).map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* QR count */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                      {c.qrCount}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  {/* View */}
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/clients/${c.userId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      {tr.clients_view}
                    </Link>
                  </td>
                  {/* Delete */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(c.userId)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        removingId === c.userId
                          ? "bg-red-600 text-white"
                          : "text-red-500 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {removingId === c.userId ? tr.clients_delete_confirm : tr.clients_delete}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Plan change confirmation modal */}
      {pendingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{tr.clients_plan_modal_title}</h2>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">From</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLORS[pendingPlan.from]}`}>
                  {PLAN_LABELS[pendingPlan.from]}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">To</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLORS[pendingPlan.to]}`}>
                  {PLAN_LABELS[pendingPlan.to]}
                </span>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500 font-medium truncate">{pendingPlan.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingPlan(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {tr.clients_plan_modal_cancel}
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={changingPlan}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {changingPlan ? "..." : tr.clients_plan_modal_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
