"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language";

type Row = {
  id: string;
  label: string;
  name: string;
  company: string;
  totalScans: number;
  nfcScans: number;
  last7d: number;
  uniqueVisitors: number;
  leads: number;
  lastScanAt: string | null;
  conversionRate: number;
};

function formatRelative(iso: string | null, neverLabel: string, lang: "de" | "en"): string {
  if (!iso) return neverLabel;
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (lang === "de") {
    if (sec < 60) return "gerade eben";
    if (min < 60) return `vor ${min} Min.`;
    if (hrs < 24) return `vor ${hrs} Std.`;
    if (days < 30) return `vor ${days} T.`;
    return new Date(iso).toLocaleDateString("de-CH");
  }
  if (sec < 60) return "just now";
  if (min < 60) return `${min} min ago`;
  if (hrs < 24) return `${hrs} h ago`;
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function AnalyticsOverviewPage() {
  const { tr, lang } = useLang();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/overview")
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .catch(() => setRows([]));
  }, []);

  const totals = (rows ?? []).reduce(
    (acc, r) => {
      acc.scans += r.totalScans;
      acc.nfc += r.nfcScans ?? 0;
      acc.scans7d += r.last7d;
      acc.unique += r.uniqueVisitors;
      acc.leads += r.leads;
      return acc;
    },
    { scans: 0, nfc: 0, scans7d: 0, unique: 0, leads: 0 }
  );

  return (
    <div className="pt-8 pb-12 px-4 sm:px-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">
          {tr.analytics_overview_title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{tr.analytics_overview_subtitle}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard icon="visibility"   label={tr.analytics_col_total}  value={totals.scans} />
        <SummaryCard icon="contactless"  label={tr.kpi_nfc_scans}        value={totals.nfc}   accent="indigo" />
        <SummaryCard icon="trending_up"  label={tr.analytics_col_7d}     value={totals.scans7d} />
        <SummaryCard icon="group"        label={tr.analytics_col_unique} value={totals.unique} />
        <SummaryCard icon="how_to_reg"   label={tr.analytics_col_leads}  value={totals.leads} />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-xl shadow-[0px_20px_40px_rgba(25,28,30,0.04)] overflow-hidden">
        {rows === null ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">{tr.analytics_loading}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">{tr.analytics_empty}</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#242736]">
                    <th className="px-6 py-4">{tr.analytics_col_code}</th>
                    <th className="px-6 py-4 text-right">{tr.analytics_col_total}</th>
                    <th className="px-6 py-4 text-right">{tr.kpi_nfc_scans}</th>
                    <th className="px-6 py-4 text-right">{tr.analytics_col_7d}</th>
                    <th className="px-6 py-4 text-right">{tr.analytics_col_unique}</th>
                    <th className="px-6 py-4 text-right">{tr.analytics_col_leads}</th>
                    <th className="px-6 py-4 text-right">{tr.analytics_col_conversion}</th>
                    <th className="px-6 py-4">{tr.analytics_col_last_scan}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 border-slate-100 dark:border-[#242736] hover:bg-slate-50 dark:hover:bg-[#242736]/40 transition-colors cursor-pointer"
                      onClick={() => { window.location.href = `/dashboard/analytics/${r.id}`; }}
                    >
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/analytics/${r.id}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600">
                          {r.label}
                        </Link>
                        {r.company && r.company !== r.label && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{r.company}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">{r.totalScans}</td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {r.nfcScans > 0 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold">
                            <span className="material-symbols-outlined text-[14px]">contactless</span>
                            {r.nfcScans}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.last7d}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.uniqueVisitors}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.leads}</td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.conversionRate >= 10 ? "bg-emerald-50 text-emerald-700" : r.conversionRate > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                          {r.conversionRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                        {formatRelative(r.lastScanAt, tr.analytics_never, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-[#242736]">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/analytics/${r.id}`}
                  className="block px-5 py-4 hover:bg-slate-50 dark:hover:bg-[#242736]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{r.label}</p>
                      {r.company && r.company !== r.label && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{r.company}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-500">
                      {formatRelative(r.lastScanAt, tr.analytics_never, lang)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <MobileStat label={tr.analytics_col_total} value={r.totalScans} />
                    <MobileStat label={tr.kpi_nfc_scans} value={r.nfcScans} accent="indigo" />
                    <MobileStat label={tr.analytics_col_7d} value={r.last7d} />
                    <MobileStat label={tr.analytics_col_unique} value={r.uniqueVisitors} />
                    <MobileStat label={tr.analytics_col_leads} value={r.leads} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent = "blue" }: { icon: string; label: string; value: number; accent?: "blue" | "indigo" }) {
  const palette = accent === "indigo"
    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
    : "bg-blue-50 dark:bg-blue-900/20 text-blue-600";
  return (
    <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-5 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${palette}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function MobileStat({ label, value, accent }: { label: string; value: number; accent?: "indigo" }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
      <p className={`text-base font-bold tabular-nums mt-0.5 ${accent === "indigo" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-slate-100"}`}>{value}</p>
    </div>
  );
}
