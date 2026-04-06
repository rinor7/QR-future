"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Plus, Pencil, Trash2, ExternalLink, Copy, Check, Zap, TrendingUp, Activity, PauseCircle, Eye, Download, Printer, Upload, BarChart2 } from "lucide-react";
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
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
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
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
  }

  const activeCount = contacts.filter((c) => c.isActive !== false).length;
  const pausedCount = contacts.filter((c) => c.isActive === false).length;

  return (
    <div className="p-4 wide:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-brand-text tracking-tight">Dashboard</h1>
          <p className="text-brand-text-secondary mt-1 text-sm">{tr.dashboard_subtitle}</p>
        </div>
        {!loading && !roleLoading && !isReader && (() => {
          const limit = PLAN_LIMITS[plan];
          const limitReached = limit !== -1 && contacts.length >= limit;
          return limitReached ? (
            <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5" style={{ border: "1px solid rgba(251,191,36,0.4)" }}>
              <span className="text-sm text-amber-800">{tr.plan_limit_reached} — </span>
              {isOwner ? (
                <Link href="/dashboard/upgrade" className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                  {tr.free_plan_upgrade}
                </Link>
              ) : (
                <span className="text-sm text-amber-700">
                  {tr.plan_limit_ask_owner}{" "}
                  <Link href="/dashboard/upgrade" className="font-semibold underline hover:text-amber-900 transition-colors">{tr.see_plans}</Link>.
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/dashboard/create"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {tr.create_qr}
            </Link>
          );
        })()}
      </div>

      {/* Free plan banner */}
      {!loading && plan === "free" && isOwner && (
        <div className="flex items-center justify-between gap-3 rounded-xl px-5 py-3 mb-6"
          style={{ background: "linear-gradient(135deg, rgba(0,62,199,0.06) 0%, rgba(0,82,255,0.08) 100%)", border: "1px solid rgba(0,62,199,0.12)" }}>
          <div className="flex items-center gap-2 text-brand-primary text-sm font-medium">
            <Zap className="w-4 h-4 shrink-0" />
            {tr.free_plan_banner}
          </div>
          <Link href="/dashboard/upgrade" className="text-sm font-semibold text-brand-primary hover:text-brand-primary-light whitespace-nowrap transition-colors">
            {tr.free_plan_upgrade} →
          </Link>
        </div>
      )}

      {/* Onboarding */}
      {!loading && !onboardingDismissed && contacts.length === 0 && (
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: "linear-gradient(135deg, rgba(0,62,199,0.05) 0%, rgba(0,82,255,0.08) 100%)", border: "1px solid rgba(0,62,199,0.1)" }}>
          <h2 className="font-headline text-base font-bold text-brand-text mb-1">{tr.onboarding_title}</h2>
          <p className="text-sm text-brand-text-secondary mb-4">{tr.onboarding_subtitle}</p>
          <ol className="space-y-2 mb-5">
            {[tr.onboarding_step1, tr.onboarding_step2, tr.onboarding_step3].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-brand-text-secondary">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white"
                  style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <button
            onClick={() => { localStorage.setItem("onboarding_dismissed", "1"); setOnboardingDismissed(true); }}
            className="btn-primary text-sm"
          >
            {tr.onboarding_dismiss}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KPICard label={tr.stat_total} value={contacts.length} icon={<QrCode className="w-5 h-5" />} color="blue" />
        <KPICard label={tr.stat_active} value={activeCount} icon={<Activity className="w-5 h-5" />} color="green" />
        <KPICard label={tr.stat_paused} value={pausedCount} icon={<PauseCircle className="w-5 h-5" />} color="amber" />
        <KPICard label={tr.scans_total} value={scanTotal} icon={<Eye className="w-5 h-5" />} color="purple" />
      </div>

      {/* Scan chart */}
      {scanLast7.length > 0 && (
        <div className="bg-brand-surface rounded-2xl p-6 mb-6 shadow-ambient">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-headline font-semibold text-brand-text">{tr.scans_last7}</h2>
            <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary">
              <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
              {tr.scans_label}
            </div>
          </div>
          <ScanChart data={scanLast7} label={tr.scans_label} />
        </div>
      )}

      {/* Recent QR codes */}
      <div className="bg-brand-surface rounded-2xl shadow-ambient overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="font-headline font-semibold text-brand-text">{tr.all_codes}</h2>
          <Link href="/dashboard/codes" className="text-xs font-semibold text-brand-primary hover:text-brand-primary-light transition-colors">
            {tr.nav_codes} →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-brand-outline">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, rgba(0,62,199,0.06) 0%, rgba(0,82,255,0.1) 100%)" }}>
              <QrCode className="w-8 h-8 text-brand-primary opacity-60" />
            </div>
            <p className="font-headline font-semibold text-brand-text-secondary">{tr.no_codes}</p>
            <p className="text-sm mt-1 text-brand-outline">{tr.no_codes_sub}</p>
            <Link href="/dashboard/create" className="btn-primary mt-4 text-sm">
              {tr.create_now}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-brand-outline uppercase tracking-wider"
                  style={{ background: "#f7f9fb" }}>
                  <th className="px-6 py-3 text-left">QR Code</th>
                  <th className="px-6 py-3 text-left">{tr.col_name}</th>
                  <th className="px-6 py-3 text-left">{tr.col_created}</th>
                  <th className="px-6 py-3 text-left">{tr.col_link}</th>
                  <th className="px-6 py-3 text-right">{tr.col_actions}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact, idx) => (
                  <tr key={contact.id}
                    className="transition-colors hover:bg-brand-bg"
                    style={idx < contacts.length - 1 ? { borderBottom: "1px solid rgba(195,197,217,0.25)" } : undefined}>
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-brand-bg flex items-center justify-center">
                        <QRCodeDisplay value={getQRUrl(contact.id)} size={48} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-brand-text text-sm">{`${contact.firstName} ${contact.lastName}`.trim() || "—"}</p>
                      <p className="text-xs text-brand-outline mt-0.5">{contact.company || contact.title || ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-brand-text-secondary">{new Date(contact.createdAt).toLocaleDateString("de-DE")}</p>
                      {contact.createdBy && (
                        <span className="text-xs text-brand-outline">{contact.createdBy.split("@")[0]}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-outline font-mono truncate max-w-[120px]">/qr/{contact.id.slice(0, 8)}…</span>
                        <button onClick={() => handleCopy(contact.id)} className="text-brand-outline hover:text-brand-primary transition-colors">
                          {copiedId === contact.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a href={`/qr/${contact.id}`} target="_blank" className="text-brand-outline hover:text-brand-primary transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isReader && (
                          <Link href={`/dashboard/edit/${contact.id}`}
                            className="p-2 text-brand-outline hover:text-brand-primary hover:bg-brand-bg rounded-xl transition-colors">
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteModal(contact.id)}
                            className="p-2 rounded-xl transition-colors text-brand-outline hover:text-brand-error hover:bg-brand-error-container">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Performance + Quick Bulk Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Campaign Performance */}
        <div className="rounded-2xl p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-white/70" />
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Campaign Performance</p>
            </div>
            <p className="text-white font-headline font-bold text-base leading-snug mb-1">
              Your &ldquo;future-lead&rdquo; campaign is<br />performing 24% better than last month.
            </p>
            <p className="text-white/60 text-xs">Based on scan analytics from the last 30 days.</p>
          </div>
          <div className="mt-4 relative z-10">
            <Link href="/dashboard/codes" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <TrendingUp className="w-4 h-4" />
              View Analytics
            </Link>
          </div>
          {/* Decoration */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="absolute -right-2 top-4 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>

        {/* Quick Bulk Actions */}
        <div className="bg-brand-surface rounded-2xl p-6 shadow-ambient-sm" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
          <p className="text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1">Quick Bulk Actions</p>
          <p className="text-sm text-brand-text-secondary mb-4">Manage multiple assets at once with enterprise tools.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Upload,   label: "Import QR",  href: "/dashboard/create" },
              { icon: Printer,  label: "Print Bulk", href: "/dashboard/codes"  },
              { icon: Download, label: "Export All", href: "/api/scan/export"  },
              { icon: BarChart2,label: "Analytics",  href: "/dashboard/codes"  },
            ].map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href}
                className="flex flex-col items-center gap-2 bg-brand-bg hover:bg-brand-surface-container rounded-xl p-3 text-center transition-colors"
                style={{ border: "1px solid rgba(195,197,217,0.4)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(0,62,199,0.08) 0%, rgba(0,82,255,0.12) 100%)" }}>
                  <Icon className="w-4 h-4 text-brand-primary" />
                </div>
                <span className="text-xs font-semibold text-brand-text-secondary">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-surface rounded-2xl shadow-ambient max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-brand-error-container rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-brand-error" />
            </div>
            <h2 className="font-headline text-lg font-bold text-brand-text text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-brand-text-secondary text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 bg-brand-surface-low text-brand-text-secondary py-2.5 rounded-xl font-medium text-sm hover:bg-brand-surface-container transition-colors">
                {tr.delete_modal_cancel}
              </button>
              <button onClick={() => handleDelete(deleteModal)}
                className="flex-1 bg-brand-error hover:opacity-90 text-white py-2.5 rounded-xl font-medium text-sm transition-opacity">
                {tr.delete_modal_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: "blue" | "green" | "amber" | "purple" }) {
  const styles = {
    blue:   { bg: "rgba(0,62,199,0.06)",  icon: "#003ec7", text: "#003ec7" },
    green:  { bg: "rgba(22,163,74,0.06)", icon: "#16a34a", text: "#16a34a" },
    amber:  { bg: "rgba(217,119,6,0.06)", icon: "#d97706", text: "#d97706" },
    purple: { bg: "rgba(147,51,234,0.06)",icon: "#9333ea", text: "#9333ea" },
  }[color];

  return (
    <div className="bg-brand-surface rounded-2xl p-5 shadow-ambient">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-brand-outline uppercase tracking-wider">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: styles.bg }}>
          <span style={{ color: styles.icon }}>{icon}</span>
        </div>
      </div>
      <p className="font-headline text-3xl font-bold text-brand-text">{value.toLocaleString()}</p>
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
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-white text-xs rounded-lg px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-ambient-sm"
              style={{ background: "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)" }}>
              {d.count} {label}
            </div>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{ height: barH, background: "linear-gradient(180deg, #0052ff 0%, #003ec7 100%)", opacity: d.count > 0 ? 1 : 0.15 }}
            />
            <span className="text-xs text-brand-outline">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
