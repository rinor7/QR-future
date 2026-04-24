"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { getUserProfile } from "@/lib/store";
import { ClientAccount, Plan, PLAN_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Users, AlertTriangle, Eye, Lock } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<ClientAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function handleConfirmDelete() {
    if (!deleteTarget || deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch("/api/admin/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.userId }),
      });
      setClients((prev) => prev.filter((c) => c.userId !== deleteTarget.userId));
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } finally {
      setDeleting(false);
    }
  }

  const INACTIVITY_DAYS = 14;
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{tr.clients_title}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{tr.clients_subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{clients.length}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{tr.clients_stat_total}</p>
        </div>
        {(["free", "star", "premium", "platinum"] as Plan[]).map((plan) => (
          <div key={plan} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{planCounts[plan]}</p>
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
              <div key={c.userId} className="flex items-center justify-between bg-white dark:bg-[#1a1d27] rounded-xl border border-amber-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800 dark:text-slate-200 font-medium">{c.email}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500">
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
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-[#242736] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[#242736] text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              <th className="text-left px-6 py-3">{tr.clients_email}</th>
              <th className="text-left px-6 py-3">{tr.clients_plan}</th>
              <th className="text-left px-6 py-3">{tr.clients_col_qr}</th>
              <th className="text-left px-6 py-3">{tr.clients_col_joined}</th>
              <th className="px-6 py-3" />
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {tr.clients_no_clients}
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.userId} className="border-b border-gray-50 dark:border-[#242736] last:border-0 hover:bg-gray-50 dark:hover:bg-[#242736]/50">
                  {/* Avatar + email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {c.email[0].toUpperCase()}
                      </div>
                      <span className="text-gray-800 dark:text-slate-200 font-medium">{c.email}</span>
                    </div>
                  </td>
                  {/* Plan */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg w-fit ${PLAN_COLORS[c.plan]}`}>
                        {PLAN_LABELS[c.plan]}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                        {c.hasStripe
                          ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Stripe</>
                          : <><Lock className="w-3 h-3" />{tr.clients_manual}</>
                        }
                      </span>
                    </div>
                  </td>
                  {/* QR count */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-700 dark:text-slate-300 font-medium">
                      {c.qrCount}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-6 py-4 text-gray-400 dark:text-slate-500 text-xs">
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
                      onClick={() => { setDeleteTarget(c); setDeleteConfirmText(""); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {tr.clients_delete}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete client confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete client account</h3>
                <p className="text-xs text-slate-500 truncate">{deleteTarget.email}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
              <p className="text-sm font-semibold text-red-800 mb-2">
                This permanently deletes their entire organisation. Unrecoverable.
              </p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>All their QR codes ({deleteTarget.qrCount})</li>
                <li>Every scan & interaction log</li>
                <li>Every lead captured</li>
                <li>Every folder and permission</li>
                <li>Every sub-user account under their org</li>
                <li>The login itself — nobody can sign back in</li>
              </ul>
            </div>
            <p className="text-sm font-semibold text-red-600 mb-3">
              This cannot be undone. No restore, no refund, no backup.
            </p>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Type <span className="text-red-500 font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-900 mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                disabled={deleting}
                className="px-5 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
