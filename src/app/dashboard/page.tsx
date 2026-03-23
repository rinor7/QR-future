"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Plus, Pencil, Trash2, ExternalLink, Copy, Check, Zap } from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";

export default function DashboardPage() {
  const { tr } = useLang();
  const router = useRouter();
  const { isAdmin, isReader, loading: roleLoading } = useRole();
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanLast7, setScanLast7] = useState<{ date: string; count: number }[]>([]);

  async function load() {
    try {
      const [data, profile] = await Promise.all([getAllContacts(), getUserProfile()]);
      setContacts(data);
      if (profile) {
        setPlan(profile.plan);
        setIsOwner(profile.userId === profile.ownerId);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p?.isPlatformAdmin) { router.replace("/dashboard/clients"); return; }
    });
    load();
    const dismissed = localStorage.getItem("onboarding_dismissed");
    if (!dismissed) setOnboardingDismissed(false);
    fetch("/api/scan/stats")
      .then((r) => r.json())
      .then(({ total, last7 }) => {
        if (total !== undefined) setScanTotal(total);
        if (last7) setScanLast7(last7);
      })
      .catch(() => {});
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  function getQRUrl(id: string) {
    return `${window.location.origin}/qr/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(getQRUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    if (deleteConfirm === id) {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }

  return (
    <div className="p-4 wide:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">{tr.dashboard_subtitle}</p>
        </div>
        {!loading && !roleLoading && !isReader && (() => {
          const limit = PLAN_LIMITS[plan];
          const limitReached = limit !== -1 && contacts.length >= limit;
          return limitReached ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-amber-800">{tr.plan_limit_reached} — </span>
              {isOwner ? (
                <Link href="/dashboard/upgrade" className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
                  {tr.free_plan_upgrade}
                </Link>
              ) : (
                <span className="text-sm text-amber-700">
                  {tr.plan_limit_ask_owner}{" "}
                  <Link href="/dashboard/upgrade" className="font-medium underline hover:text-amber-900 transition-colors">{tr.see_plans}</Link>.
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/dashboard/create"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              {tr.create_qr}
            </Link>
          );
        })()}
      </div>

      {/* Free plan banner */}
      {!loading && plan === "free" && isOwner && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            {tr.free_plan_banner}
          </div>
          <Link href="/dashboard/upgrade" className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap transition-colors">
            {tr.free_plan_upgrade}
          </Link>
        </div>
      )}

      {/* Onboarding banner */}
      {!loading && !onboardingDismissed && contacts.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold text-blue-900 mb-1">{tr.onboarding_title}</h2>
          <p className="text-sm text-blue-700 mb-4">{tr.onboarding_subtitle}</p>
          <ol className="space-y-2 mb-5">
            {[tr.onboarding_step1, tr.onboarding_step2, tr.onboarding_step3].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <button
            onClick={() => {
              localStorage.setItem("onboarding_dismissed", "1");
              setOnboardingDismissed(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            {tr.onboarding_dismiss}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        <StatCard
          label={tr.stat_total}
          value={contacts.length}
          icon={<QrCode className="w-6 h-6 text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label={tr.stat_active}
          value={contacts.filter((c) => c.isActive !== false).length}
          icon={<span className="text-2xl">✅</span>}
          bg="bg-green-50"
        />
        <StatCard
          label={tr.stat_paused}
          value={contacts.filter((c) => c.isActive === false).length}
          icon={<span className="text-2xl">⏸️</span>}
          bg="bg-amber-50"
        />
        <StatCard
          label={tr.scans_total}
          value={scanTotal}
          icon={<span className="text-2xl">👁️</span>}
          bg="bg-orange-50"
        />
      </div>

      {/* Scan chart */}
      {scanLast7.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{tr.scans_last7}</h2>
          <ScanChart data={scanLast7} label={tr.scans_label} />
        </div>
      )}

      {/* QR Codes list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{tr.all_codes}</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <QrCode className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">{tr.no_codes}</p>
            <p className="text-sm mt-1">{tr.no_codes_sub}</p>
            <Link
              href="/dashboard/create"
              className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              {tr.create_now}
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">QR Code</th>
                <th className="px-6 py-3 text-left">{tr.col_name}</th>
                <th className="px-6 py-3 text-left">{tr.col_created}</th>
                <th className="px-6 py-3 text-left">{tr.col_link}</th>
                <th className="px-6 py-3 text-right">{tr.col_actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-14 h-14">
                      <QRCodeDisplay value={getQRUrl(contact.id)} size={56} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{`${contact.firstName} ${contact.lastName}`.trim() || "—"}</p>
                    <p className="text-sm text-gray-500">{contact.company || contact.title || ""}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 leading-5">
                    {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                    {contact.createdBy && (
                      <span className="block text-xs text-gray-400 mt-0.5">{contact.createdBy.split("@")[0]}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono truncate max-w-[140px]">
                        /qr/{contact.id}
                      </span>
                      <button
                        onClick={() => handleCopy(contact.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {copiedId === contact.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`/qr/${contact.id}`}
                        target="_blank"
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isReader && (
                        <Link
                          href={`/dashboard/edit/${contact.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            deleteConfirm === contact.id
                              ? "text-red-600 bg-red-50"
                              : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                          }`}
                          title={deleteConfirm === contact.id ? tr.delete_confirm : tr.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-4xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  );
}

function ScanChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartH = 80;
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => {
        const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 4 : 2);
        const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {d.count} {label}
            </div>
            <div
              className="w-full rounded-t-md bg-blue-500 transition-all"
              style={{ height: barH }}
            />
            <span className="text-xs text-gray-400">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
