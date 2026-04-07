"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";

export default function DashboardPage() {
  const { tr } = useLang();
  const router = useRouter();
  const { isReader, loading: roleLoading } = useRole();
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);
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
    fetch("/api/scan/stats")
      .then((r) => r.json())
      .then(({ total, last7 }) => {
        if (total !== undefined) setScanTotal(total);
        if (last7) setScanLast7(last7);
      })
      .catch(() => {});
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
  }

  const activeCount = contacts.filter((c) => c.isActive !== false).length;
  const pausedCount = contacts.filter((c) => c.isActive === false).length;

  // Chart: use real data or static placeholders
  const chartDays: { label: string; outerPct: number; innerPct: number }[] =
    scanLast7.length > 0
      ? (() => {
          const max = Math.max(...scanLast7.map((d) => d.count), 1);
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return scanLast7.map((d) => ({
            label: days[new Date(d.date + "T00:00:00").getDay()],
            outerPct: Math.max(10, Math.round((d.count / max) * 90)),
            innerPct: Math.max(30, Math.round((d.count / max) * 75)),
          }));
        })()
      : [
          { label: "Mon", outerPct: 40, innerPct: 60 },
          { label: "Tue", outerPct: 65, innerPct: 80 },
          { label: "Wed", outerPct: 50, innerPct: 45 },
          { label: "Thu", outerPct: 90, innerPct: 70 },
          { label: "Fri", outerPct: 75, innerPct: 85 },
          { label: "Sat", outerPct: 45, innerPct: 30 },
          { label: "Sun", outerPct: 60, innerPct: 55 },
        ];

  const kpiCards = [
    { label: "Total QR Codes", value: contacts.length, icon: "qr_code_2", colorBg: "bg-blue-50", colorText: "text-blue-700", hoverBg: "group-hover:bg-blue-600", badge: "+12%", badgeClass: "text-green-600 bg-green-50" },
    { label: "Active Assets", value: activeCount, icon: "check_circle", colorBg: "bg-green-50", colorText: "text-green-700", hoverBg: "group-hover:bg-green-600", badge: "Active", badgeClass: "text-slate-400" },
    { label: "Paused", value: pausedCount, icon: "pause_circle", colorBg: "bg-amber-50", colorText: "text-amber-700", hoverBg: "group-hover:bg-amber-600", badge: "-3", badgeClass: "text-red-500 bg-red-50" },
    { label: "Total Scans", value: scanTotal, icon: "analytics", colorBg: "bg-purple-50", colorText: "text-purple-700", hoverBg: "group-hover:bg-purple-600", badge: "+4.2k", badgeClass: "text-green-600 bg-green-50" },
  ];

  // Recent activity: last 4 contacts
  const recentContacts = contacts.slice(0, 4);

  const limit = PLAN_LIMITS[plan];
  const limitReached = !roleLoading && !isReader && limit !== -1 && contacts.length >= limit;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Dashboard</h2>
          <p className="text-slate-500 mt-1">{tr.dashboard_subtitle}</p>
        </div>
        <div className="flex gap-3">
          {limitReached && isOwner && (
            <Link href="/dashboard/upgrade" className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold border border-amber-200 hover:bg-amber-100 transition-colors">
              Upgrade Plan →
            </Link>
          )}
          {!limitReached && !isReader && (
            <Link href="/dashboard/create" className="btn-primary flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-sm">add</span>
              {tr.create_qr}
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(25,28,30,0.04)] group hover:-translate-y-0.5 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 ${card.colorBg} ${card.colorText} rounded-xl ${card.hoverBg} group-hover:text-white transition-colors`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.badgeClass}`}>{card.badge}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{card.label}</p>
            <h3 className="text-3xl font-bold font-headline mt-1">{card.value.toLocaleString()}</h3>
          </div>
        ))}
      </div>

      {/* Main grid: Chart (2/3) + Recent Activity (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-bold font-headline">Last 7 Days Activity</h4>
              <p className="text-sm text-slate-500">Scan performance across all active nodes</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs font-semibold text-slate-600">Total Scans</span>
            </div>
          </div>
          <div className="flex items-end justify-between h-64 gap-4 px-2">
            {chartDays.map((day) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-3 group/bar">
                <div
                  className="w-full bg-slate-100 rounded-t-lg group-hover/bar:bg-primary/20 transition-colors relative"
                  style={{ height: `${day.outerPct}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-primary rounded-t-lg"
                    style={{ height: `${day.innerPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_20px_40px_rgba(25,28,30,0.04)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold font-headline">Recent Activity</h4>
            <Link href="/dashboard/codes" className="text-primary text-sm font-bold hover:underline">View All</Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1 py-10">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">qr_code_2</span>
              <p className="text-sm text-slate-500">No QR codes yet</p>
              <Link href="/dashboard/create" className="btn-primary mt-3 text-xs py-2 px-4">Create first</Link>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {recentContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group/item">
                  <div className="w-12 h-12 bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <QRCodeDisplay value={`${typeof window !== "undefined" ? window.location.origin : ""}/qr/${contact.id}`} size={40} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate">{`${contact.firstName} ${contact.lastName}`.trim() || "—"}</h5>
                    <p className="text-xs text-slate-500 truncate">{contact.company || contact.title || ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                    </p>
                    <span className={`inline-block w-2 h-2 rounded-full ${contact.isActive !== false ? "bg-green-500" : "bg-amber-500"}`}></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-5">
            <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg shrink-0">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900">Need more insights?</p>
                <p className="text-[10px] text-blue-700">Upgrade to Pro for advanced tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance + Quick Bulk Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Campaign Performance */}
        <div className="bg-primary rounded-2xl p-8 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-2xl font-bold font-headline mb-2">Campaign Performance</h4>
            <p className="text-blue-100 mb-6 max-w-xs">Your &ldquo;Autumn Retail&rdquo; campaign is performing 24% better than last month.</p>
            <Link href="/dashboard/codes" className="inline-block bg-white text-primary font-bold px-6 py-2 rounded-full text-sm hover:bg-blue-50 transition-colors">
              View Analytics
            </Link>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <span className="material-symbols-outlined absolute top-4 right-6 text-white/20 select-none" style={{ fontSize: "5rem" }}>rocket_launch</span>
        </div>

        {/* Quick Bulk Actions */}
        <div className="bg-surface-container-high rounded-2xl p-8 flex flex-col justify-center">
          <h4 className="text-xl font-bold font-headline text-on-surface mb-2">Quick Bulk Actions</h4>
          <p className="text-slate-600 mb-6">Manage multiple assets at once with enterprise tools.</p>
          <div className="flex gap-4">
            {[
              { icon: "file_upload", label: "Import CSV", href: "/dashboard/create" },
              { icon: "print", label: "Print Batch", href: "/dashboard/codes" },
              { icon: "download", label: "Export All", href: "/api/scan/export" },
            ].map(({ icon, label, href }) => (
              <Link key={label} href={href} className="flex-1 flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-primary">{icon}</span>
                <span className="text-xs font-bold text-slate-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.12)] max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-error" />
            </div>
            <h2 className="font-headline text-lg font-bold text-on-surface text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">{tr.delete_modal_body}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 bg-surface-container-low text-slate-600 py-2.5 rounded-xl font-medium text-sm hover:bg-surface-container transition-colors">
                {tr.delete_modal_cancel}
              </button>
              <button onClick={() => handleDelete(deleteModal)} className="flex-1 bg-error hover:opacity-90 text-white py-2.5 rounded-xl font-medium text-sm transition-opacity">
                {tr.delete_modal_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
