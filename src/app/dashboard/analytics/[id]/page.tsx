"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAllContacts } from "@/lib/store";
import { QRContact } from "@/lib/types";

const EVENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  click_phone:            { label: "Phone call",      icon: "call",          color: "text-green-600 bg-green-50" },
  click_email:            { label: "Email",            icon: "mail",          color: "text-blue-600 bg-blue-50" },
  click_website:          { label: "Website",          icon: "language",      color: "text-purple-600 bg-purple-50" },
  click_pdf:              { label: "PDF opened",       icon: "picture_as_pdf",color: "text-red-600 bg-red-50" },
  click_link:             { label: "Link clicked",     icon: "link",          color: "text-slate-600 bg-slate-100" },
  click_save_contact:     { label: "Saved contact",    icon: "contact_page",  color: "text-teal-600 bg-teal-50" },
  click_share:            { label: "Shared",           icon: "share",         color: "text-orange-600 bg-orange-50" },
  click_social_linkedin:  { label: "LinkedIn",         icon: "open_in_new",   color: "text-blue-700 bg-blue-50" },
  click_social_instagram: { label: "Instagram",        icon: "open_in_new",   color: "text-pink-600 bg-pink-50" },
  click_social_facebook:  { label: "Facebook",         icon: "open_in_new",   color: "text-blue-600 bg-blue-50" },
  click_social_tiktok:    { label: "TikTok",           icon: "open_in_new",   color: "text-slate-800 bg-slate-100" },
  click_social_snapchat:  { label: "Snapchat",         icon: "open_in_new",   color: "text-yellow-500 bg-yellow-50" },
  click_social_x:         { label: "X (Twitter)",      icon: "open_in_new",   color: "text-slate-800 bg-slate-100" },
  click_social_other:     { label: "Other social",     icon: "open_in_new",   color: "text-slate-600 bg-slate-100" },
};

interface AnalyticsData {
  total: number;
  unique: number;
  returning: number;
  new: number;
  visitFrequency: { once: number; twice: number; threeplus: number };
  last30: { date: string; count: number }[];
  devices: { name: string; count: number }[];
  os: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  interactions: { event: string; count: number }[];
  recentScans: { scanned_at: string; device_type: string; os: string; country: string; city: string; is_returning: boolean; visitor_id: string | null }[];
  hotLeads: { visitorId: string; scanCount: number; lastSeen: string | null; device: string | null; os: string | null; country: string | null; city: string | null; isReturning: boolean; events: string[]; score: number; tier: "low" | "medium" | "high" }[];
  conversionRate: number;
  convertedVisitors: number;
  conversionBreakdown: { event: string; visitors: number; rate: number }[];
  leads: { id: string; name: string; email: string; company: string | null; consented_at: string; created_at: string }[];
}

function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-6 text-right">{value}</span>
    </div>
  );
}

function SparkLine({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 100 / data.length;
  const points = data.map((d, i) => {
    const x = i * w + w / 2;
    const y = 100 - (d.count / max) * 80 - 5;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-24">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#sparkGrad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [contact, setContact] = useState<QRContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/analytics/${id}`).then((r) => r.json()),
      getAllContacts(),
    ]).then(([analytics, contacts]) => {
      setData(analytics);
      setContact(contacts.find((c: QRContact) => c.id === id) ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || data.total === undefined) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Analytics not available for this QR code.</p>
        <Link href="/dashboard/codes" className="text-blue-600 hover:underline mt-2 inline-block">← Back to QR Codes</Link>
      </div>
    );
  }

  const name = contact ? `${contact.firstName} ${contact.lastName}`.trim() || contact.company || "QR Code" : "QR Code";
  const returningRate = data.total > 0 ? Math.round((data.returning / data.total) * 100) : 0;

  const freq = data.visitFrequency ?? { once: 0, twice: 0, threeplus: 0 };
  const freqTotal = freq.once + freq.twice + freq.threeplus;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Analytics for</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{name}</h1>
          </div>
        </div>
        <Link href={`/dashboard/edit/${id}`} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-[16px]">edit</span>
          Edit QR
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Scans",      value: data.total,                     icon: "qr_code_scanner", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Unique Visitors",  value: data.unique,                    icon: "person",          color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Returning",        value: data.returning,                 icon: "repeat",          color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", badge: returningRate > 0 ? `${returningRate}%` : null },
          { label: "Conversion Rate",  value: `${data.conversionRate ?? 0}%`, icon: "conversion_path", color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-900/20",   badge: (data.convertedVisitors ?? 0) > 0 ? `${data.convertedVisitors} converted` : null },
        ].map(({ label, value, icon, color, bg, badge }) => (
          <div key={label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">{label}</p>
              {badge && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">{badge}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Scan chart */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Scans — Last 30 Days</h3>
          <span className="text-xs text-slate-400">{data.total} total</span>
        </div>
        {data.last30.every((d) => d.count === 0) ? (
          <div className="h-24 flex items-center justify-center text-slate-300 text-sm">No scans yet in this period</div>
        ) : (
          <div className="relative">
            <SparkLine data={data.last30} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">{data.last30[0]?.date?.slice(5)}</span>
              <span className="text-[10px] text-slate-400">{data.last30[data.last30.length - 1]?.date?.slice(5)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Visitor loyalty */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Visitor Loyalty</h3>
            <p className="text-xs text-slate-400 mt-0.5">How often the same person scans this QR code</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />New
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block ml-2" />Returning
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Scanned once",    value: freq.once,      color: "bg-green-400",  textColor: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20",  icon: "looks_one" },
            { label: "Scanned twice",   value: freq.twice,     color: "bg-blue-400",   textColor: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",    icon: "looks_two" },
            { label: "3+ times",        value: freq.threeplus, color: "bg-purple-500", textColor: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20",icon: "local_fire_department" },
          ].map(({ label, value, color, textColor, bg, icon }) => {
            const pct = freqTotal > 0 ? Math.round((value / freqTotal) * 100) : 0;
            return (
              <div key={label} className={`rounded-xl p-4 ${bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`material-symbols-outlined text-[18px] ${textColor}`}>{icon}</span>
                  <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
                </div>
                <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
                <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Conversion Funnel</h3>
            <p className="text-xs text-slate-400 mt-0.5">% of unique visitors who took each action</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-600">{data.conversionRate ?? 0}%</p>
              <p className="text-[10px] text-slate-400">overall conversion</p>
            </div>
          </div>
        </div>
        {(data.conversionBreakdown ?? []).length === 0 ? (
          <div className="py-6 text-center">
            <span className="material-symbols-outlined text-[36px] text-slate-200 dark:text-slate-700 block mb-2">conversion_path</span>
            <p className="text-sm text-slate-400">No conversions tracked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(data.conversionBreakdown ?? []).map(({ event, visitors, rate }) => {
              const meta = EVENT_LABELS[event] ?? { label: event, icon: "touch_app", color: "text-slate-600 bg-slate-100" };
              return (
                <div key={event} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 w-32 shrink-0">{meta.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 w-20 text-right shrink-0">{visitors} ({rate}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interaction funnel + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Interactions breakdown */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Interactions</h3>
          {data.interactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No interactions tracked yet</p>
          ) : (
            <div className="space-y-3">
              {data.interactions
                .sort((a, b) => b.count - a.count)
                .map(({ event, count }) => {
                  const meta = EVENT_LABELS[event] ?? { label: event, icon: "touch_app", color: "text-slate-600 bg-slate-100" };
                  const maxCount = Math.max(...data.interactions.map((i) => i.count));
                  return (
                    <div key={event} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                        <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 w-32 shrink-0">{meta.label}</span>
                      <MiniBar value={count} max={maxCount} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Device + OS */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Device Type</h3>
            <div className="space-y-2">
              {data.devices.length === 0 ? <p className="text-sm text-slate-400">No data</p> : data.devices.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 w-5 shrink-0">
                    {name === "Mobile" ? "smartphone" : name === "Tablet" ? "tablet" : "computer"}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 w-20 shrink-0">{name}</span>
                  <MiniBar value={count} max={Math.max(...data.devices.map((d) => d.count))} color="bg-purple-400" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-[#242736] pt-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Operating System</h3>
            <div className="space-y-2">
              {data.os.length === 0 ? <p className="text-sm text-slate-400">No data</p> : data.os.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 w-5 shrink-0">
                    {name === "iOS" || name === "macOS" ? "apple" : name === "Android" ? "android" : "desktop_windows"}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 w-20 shrink-0">{name}</span>
                  <MiniBar value={count} max={Math.max(...data.os.map((d) => d.count))} color="bg-teal-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Countries + Recent scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Countries */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Top Countries</h3>
          {data.countries.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No location data yet</p>
          ) : (
            <div className="space-y-2">
              {data.countries.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 w-5 shrink-0">location_on</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 w-28 shrink-0 truncate">{name}</span>
                  <MiniBar value={count} max={data.countries[0].count} color="bg-orange-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Scans</h3>
          {data.recentScans.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No scans yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentScans.slice(0, 8).map((scan, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-50 dark:border-[#242736] last:border-0">
                  <span className={`material-symbols-outlined text-[15px] ${scan.is_returning ? "text-purple-400" : "text-green-400"}`}>
                    {scan.is_returning ? "repeat" : "fiber_new"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {[scan.city, scan.country].filter(Boolean).join(", ") || "Unknown location"}
                    </p>
                    <p className="text-[10px] text-slate-400">{scan.device_type} · {scan.os}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 shrink-0">
                    {new Date(scan.scanned_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Captured Leads */}
      {(data.leads ?? []).length > 0 && (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-teal-600">contact_mail</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Captured Leads</h3>
              <p className="text-xs text-slate-400">Visitors who submitted their contact details</p>
            </div>
            <span className="ml-auto text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1 rounded-full">
              {data.leads.length} {data.leads.length === 1 ? "lead" : "leads"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#242736]">
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">Email</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">Company</th>
                  <th className="text-left text-xs font-semibold text-slate-400 pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#242736]">
                {data.leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 text-xs font-bold shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{lead.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{lead.company || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hot Leads */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-red-500">local_fire_department</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Hot Leads</h3>
            <p className="text-xs text-slate-400">Visitors who clicked phone, email, or saved contact</p>
          </div>
          <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">
            {(data.hotLeads ?? []).length} leads
          </span>
        </div>
        {(data.hotLeads ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-200 dark:text-slate-700 block mb-2">person_search</span>
            <p className="text-sm text-slate-400">No high-intent interactions yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Leads appear when someone clicks phone, email, or saves your contact</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(data.hotLeads ?? []).map((lead, i) => {
              const tierStyle = lead.tier === "high"
                ? { pill: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", label: "High", dot: "bg-red-500" }
                : lead.tier === "medium"
                ? { pill: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", label: "Medium", dot: "bg-amber-400" }
                : { pill: "text-slate-500 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600", label: "Low", dot: "bg-slate-400" };
              return (
              <div key={lead.visitorId} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-[#242736] border border-slate-100 dark:border-[#2a2e3e]">
                {/* Rank */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 text-slate-500">
                  {i + 1}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Score tier badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${tierStyle.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tierStyle.dot}`} />
                      {tierStyle.label} · {lead.score}pts
                    </span>
                    {lead.isReturning && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">Returning</span>
                    )}
                    {lead.scanCount >= 3 && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">🔥 {lead.scanCount}x scanned</span>
                    )}
                    {lead.scanCount === 2 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full">{lead.scanCount}x scanned</span>
                    )}
                    <p className="text-xs text-slate-400 truncate">
                      {[lead.city, lead.country].filter(Boolean).join(", ") || "Unknown location"} · {lead.device} · {lead.os}
                    </p>
                  </div>
                  {/* Event pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {lead.events.map((ev) => {
                      const meta = EVENT_LABELS[ev] ?? { label: ev, icon: "touch_app", color: "text-slate-600 bg-slate-100" };
                      return (
                        <span key={ev} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {/* Last seen */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">Last seen</p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {lead.lastSeen ? new Date(lead.lastSeen).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
