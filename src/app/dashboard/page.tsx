"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";

const EVENT_ICONS: Record<string, string> = {
  click_phone: "call", click_email: "mail", click_website: "language",
  click_pdf: "picture_as_pdf", click_link: "link", click_save_contact: "contact_page",
  click_share: "share", click_social_linkedin: "open_in_new", click_social_instagram: "open_in_new",
  click_social_facebook: "open_in_new", click_social_tiktok: "open_in_new",
  click_social_snapchat: "open_in_new", click_social_x: "open_in_new", click_social_other: "open_in_new",
  lead_capture_open: "contact_mail", lead_capture_submit: "mark_email_read",
};

interface StatsData {
  total: number;
  unique: number;
  returning: number;
  chart: { date: string; count: number }[];
  interactions: { event: string; count: number }[];
  topQR: { id: string; count: number }[];
  conversionRate: number;
}

export default function DashboardPage() {
  const { tr } = useLang();
  const router = useRouter();
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [chartRange, setChartRange] = useState<"7" | "30">("7");
  const [chartLoading, setChartLoading] = useState(false);

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

  async function loadStats(range: "7" | "30") {
    setChartLoading(true);
    try {
      const r = await fetch(`/api/scan/stats?range=${range}`);
      const data = await r.json();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p?.isPlatformAdmin) { router.replace("/dashboard/clients"); return; }
    });
    load();
    loadStats("7");
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
  }

  function handleRangeChange(range: "7" | "30") {
    setChartRange(range);
    loadStats(range);
  }

  const activeCount = contacts.filter((c) => c.isActive !== false).length;
  const pausedCount = contacts.filter((c) => c.isActive === false).length;
  const recentContacts = contacts.slice(0, 3);
  const limit = PLAN_LIMITS[plan];
  const limitReached = limit !== -1 && contacts.length >= limit;

  // Build chart bars
  const chart = stats?.chart ?? [];
  const chartMax = Math.max(...chart.map((d) => d.count), 1);
  const totalInteractions = stats?.interactions.reduce((s, i) => s + i.count, 0) ?? 0;
  const returningRate = (stats?.total ?? 0) > 0 ? Math.round(((stats?.returning ?? 0) / stats!.total) * 100) : 0;

  // Map topQR ids to contact names
  const topQR = (stats?.topQR ?? []).map(({ id, count }) => {
    const c = contacts.find((x) => x.id === id);
    return { id, count, name: c ? `${c.firstName} ${c.lastName}`.trim() || c.company || "—" : "—" };
  });

  const EVENT_LABELS: Record<string, string> = {
    click_phone:            tr.evt_phone,
    click_email:            tr.evt_email,
    click_website:          tr.evt_website,
    click_pdf:              tr.evt_pdf,
    click_link:             tr.evt_link,
    click_save_contact:     tr.evt_save_contact,
    click_share:            tr.evt_share,
    click_social_linkedin:  tr.evt_linkedin,
    click_social_instagram: tr.evt_instagram,
    click_social_facebook:  tr.evt_facebook,
    click_social_tiktok:    tr.evt_tiktok,
    click_social_snapchat:  tr.evt_snapchat,
    click_social_x:         tr.evt_x,
    click_social_other:     tr.evt_other,
    lead_capture_open:      tr.evt_lead_open,
    lead_capture_submit:    tr.evt_lead_submit,
  };

  const kpiCards = [
    { label: tr.kpi_total_qrs,        display: contacts.length.toLocaleString(),                icon: "qr_code_2",         color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: tr.kpi_total_scans,      display: (stats?.total ?? 0).toLocaleString(),            icon: "qr_code_scanner",   color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: tr.kpi_unique_visitors,  display: (stats?.unique ?? 0).toLocaleString(),           icon: "person",            color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
    { label: tr.kpi_returning,        display: (stats?.returning ?? 0).toLocaleString(),        icon: "repeat",            color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", badge: returningRate > 0 ? `${returningRate}%` : null },
    { label: tr.kpi_conversion_rate,  display: `${stats?.conversionRate ?? 0}%`,                icon: "conversion_path",   color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-900/20" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-slate-100">{tr.dashboard_title}</h2>
          <p className="text-slate-500 mt-1 text-sm">{tr.dashboard_subtitle}</p>
        </div>
        <div className="flex gap-3">
          {limitReached && isOwner && (
            <Link href="/dashboard/upgrade" className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold border border-amber-200 hover:bg-amber-100 transition-colors">
              {tr.upgrade_plan_btn}
            </Link>
          )}
          {!limitReached && (
            <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-sm">add</span>
              {tr.create_qr}
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5 hover:-translate-y-0.5 transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
              <span className={`material-symbols-outlined text-[20px] ${card.color}`}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.display}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">{card.label}</p>
              {"badge" in card && card.badge && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">{card.badge}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Active / Paused mini row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-100 dark:border-[#242736] px-5 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tr.dashboard_active_codes}</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{activeCount}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-100 dark:border-[#242736] px-5 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tr.dashboard_paused_codes}</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{pausedCount}</span>
        </div>
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{tr.chart_title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{tr.chart_subtitle}</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#242736] rounded-xl p-1">
              {(["7", "30"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chartRange === r ? "bg-white dark:bg-[#1a1d27] text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chart.every((d) => d.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">{tr.chart_no_scans}</div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div
              className="flex items-end gap-2 h-48"
              style={{ minWidth: chartRange === "30" ? `${chart.length * 36}px` : undefined }}
            >
              {chart.map((day, i) => {
                const pct = Math.max(4, Math.round((day.count / chartMax) * 100));
                const label = chartRange === "7"
                  ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(day.date + "T00:00:00").getDay()]
                  : day.date.slice(5);
                const showLabel = chartRange === "7" || i % 3 === 0 || i === chart.length - 1;
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1 group/bar"
                    style={{ width: chartRange === "30" ? "28px" : undefined, flex: chartRange === "7" ? "1" : undefined }}
                  >
                    <div className="w-full relative flex items-end" style={{ height: "172px" }}>
                      <div
                        title={`${day.count} scans`}
                        className="w-full rounded-t-lg bg-blue-500 group-hover/bar:bg-blue-400 transition-colors"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{showLabel ? label : ""}</span>
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">{tr.recent_codes}</h4>
            <Link href="/dashboard/codes" className="text-blue-600 text-xs font-semibold hover:underline">{tr.view_all}</Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-700 mb-2">qr_code_2</span>
              <p className="text-sm text-slate-400">{tr.no_qrs_yet}</p>
              <Link href="/dashboard/create" className="btn-primary mt-3 text-xs py-2 px-4">{tr.create_first}</Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentContacts.map((contact) => (
                <Link key={contact.id} href={`/dashboard/edit/${contact.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
                  <div className="w-14 h-14 bg-white dark:bg-white border border-slate-200 rounded-xl shrink-0 flex items-center justify-center p-1">
                    <QRCodeDisplay value={`${typeof window !== "undefined" ? window.location.origin : "https://placeholder.com"}/qr/${contact.id}`} size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{`${contact.firstName} ${contact.lastName}`.trim() || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{contact.company || contact.title || ""}</p>
                    {contact.createdBy && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{tr.by_label} {contact.createdBy}</p>
                    )}
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${contact.isActive !== false ? "bg-green-500" : "bg-amber-400"}`} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactions + Top QR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Click counts per element */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{tr.interactions_title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{tr.interactions_subtitle}</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-[#242736] px-2.5 py-1 rounded-full">{totalInteractions.toLocaleString()} {tr.interactions_total}</span>
          </div>
          {(stats?.interactions ?? []).length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-[40px] text-slate-200 dark:text-slate-700 block mb-2">touch_app</span>
              <p className="text-sm text-slate-400">{tr.no_interactions}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(stats?.interactions ?? []).slice(0, 8).map(({ event, count }) => {
                const pct = totalInteractions > 0 ? Math.round((count / totalInteractions) * 100) : 0;
                const label = EVENT_LABELS[event] ?? event;
                const icon = EVENT_ICONS[event] ?? "touch_app";
                return (
                  <div key={event} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 w-5 shrink-0">{icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top performing QR codes */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{tr.top_qrs_title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{tr.top_qrs_subtitle}</p>
            </div>
            <Link href="/dashboard/codes" className="text-xs font-semibold text-blue-600 hover:underline">{tr.view_all}</Link>
          </div>
          {topQR.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-[40px] text-slate-200 dark:text-slate-700 block mb-2">leaderboard</span>
              <p className="text-sm text-slate-400">{tr.no_scan_data}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topQR.map(({ id, count, name }, i) => {
                const maxCount = topQR[0].count;
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-base w-5 shrink-0 text-center">{medals[i] ?? `${i + 1}.`}</span>
                    <Link href={`/dashboard/analytics/${id}`} className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1 hover:text-blue-600 transition-colors min-w-0">{name}</Link>
                    <div className="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 w-10 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 bg-slate-100 dark:bg-[#242736] text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-200 dark:hover:bg-[#2a2e3e] transition-colors">
                {tr.delete_modal_cancel}
              </button>
              <button onClick={() => handleDelete(deleteModal)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
                {tr.delete_modal_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
