"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, Users, BarChart2, Mail, CreditCard, CalendarDays, Activity } from "lucide-react";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";
import { Plan, PLAN_LABELS } from "@/lib/types";

const PLAN_COLORS: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600",
  star: "bg-yellow-100 text-yellow-700",
  premium: "bg-blue-100 text-blue-700",
  platinum: "bg-purple-100 text-purple-700",
};

interface ClientProfile {
  userId: string;
  email: string;
  plan: Plan;
  createdAt: string;
  lastActivityAt: string | null;
  hasStripe: boolean;
}

interface Member {
  email: string;
  role: string;
  joinedAt: string;
}

interface QRCode {
  id: string;
  label: string;
  company: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  scans: number;
}

interface ClientDetail {
  profile: ClientProfile;
  members: Member[];
  qrCodes: QRCode[];
  totalScans: number;
}

export default function ClientDetailPage() {
  const { tr } = useLang();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrPage, setQrPage] = useState(0);
  const QR_PAGE_SIZE = 30;

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p?.isPlatformAdmin) {
        router.replace("/dashboard");
        return;
      }
      fetch(`/api/admin/clients/${userId}`)
        .then((r) => r.json())
        .then((data) => setDetail(data))
        .finally(() => setLoading(false));
    });
  }, [userId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500 dark:text-slate-400">{tr.clients_not_found}</p>
      </div>
    );
  }

  const { profile, members, qrCodes, totalScans } = detail;
  const activeCount = qrCodes.filter((q) => q.isActive).length;
  const pausedCount = qrCodes.filter((q) => !q.isActive).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {tr.client_detail_back}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
            {profile.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{profile.email}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[profile.plan]}`}>
                {PLAN_LABELS[profile.plan]}
              </span>
              {profile.hasStripe && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CreditCard className="w-3.5 h-3.5" />
                  {tr.client_detail_stripe}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label={tr.client_detail_qrcodes}
          value={qrCodes.length}
          icon={<QrCode className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label={tr.client_detail_active}
          value={activeCount}
          icon={<span className="text-lg">✅</span>}
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          label={tr.client_detail_paused}
          value={pausedCount}
          icon={<span className="text-lg">⏸️</span>}
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label={tr.client_detail_total_scans}
          value={totalScans}
          icon={<BarChart2 className="w-5 h-5 text-orange-500" />}
          bg="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* Profile info */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{tr.client_detail_profile}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400 dark:text-slate-500" />} label={tr.clients_email} value={profile.email} />
          <InfoRow
            icon={<CalendarDays className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
            label={tr.client_detail_joined}
            value={new Date(profile.createdAt).toLocaleDateString()}
          />
          <InfoRow
            icon={<Activity className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
            label={tr.client_detail_last_active}
            value={profile.lastActivityAt ? new Date(profile.lastActivityAt).toLocaleDateString() : "—"}
          />
        </div>
      </div>

      {/* Team members */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-[#242736] flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{tr.client_detail_members} ({members.length})</h2>
        </div>
        {members.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-400 dark:text-slate-500">{tr.client_detail_no_members}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide bg-gray-50">
                <th className="text-left px-6 py-3">{tr.clients_email}</th>
                <th className="text-left px-6 py-3">{tr.client_detail_role}</th>
                <th className="text-left px-6 py-3">{tr.client_detail_joined_team}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-[#242736]">
                  <td className="px-6 py-3 text-gray-800 dark:text-slate-200">{m.email}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 dark:text-slate-500 text-xs">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* QR Codes */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 dark:border-[#242736] flex items-center gap-2">
          <QrCode className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{tr.client_detail_qrcodes} ({qrCodes.length})</h2>
        </div>
        {qrCodes.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-400 dark:text-slate-500">{tr.client_detail_no_qr}</p>
        ) : (
          (() => {
            const totalPages = Math.ceil(qrCodes.length / QR_PAGE_SIZE);
            const paginated  = qrCodes.slice(qrPage * QR_PAGE_SIZE, (qrPage + 1) * QR_PAGE_SIZE);
            return (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide bg-gray-50">
                      <th className="text-left px-6 py-3">{tr.clients_label}</th>
                      <th className="text-left px-6 py-3">{tr.clients_status}</th>
                      <th className="text-left px-6 py-3">{tr.client_detail_scans}</th>
                      <th className="text-left px-6 py-3">{tr.client_detail_joined}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((q) => (
                      <tr key={q.id} className="border-t border-gray-50 dark:border-[#242736] hover:bg-gray-50 dark:hover:bg-[#242736]/50">
                        <td className="px-6 py-3">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{q.label}</p>
                          {q.company && <p className="text-xs text-gray-400 dark:text-slate-500">{q.company}</p>}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            q.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 dark:text-slate-400"
                          }`}>
                            {q.isActive ? tr.client_detail_active : tr.client_detail_paused}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-slate-300 font-medium">
                            <BarChart2 className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                            {q.scans}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-400 dark:text-slate-500 text-xs">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-[#242736] text-xs text-gray-500 dark:text-slate-400">
                    <span>
                      Showing {qrPage * QR_PAGE_SIZE + 1}–{Math.min((qrPage + 1) * QR_PAGE_SIZE, qrCodes.length)} of {qrCodes.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setQrPage((p) => Math.max(0, p - 1))}
                        disabled={qrPage === 0}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#242736] hover:bg-gray-50 dark:hover:bg-[#242736] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 font-medium">Page {qrPage + 1} / {totalPages}</span>
                      <button
                        onClick={() => setQrPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={qrPage >= totalPages - 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#242736] hover:bg-gray-50 dark:hover:bg-[#242736] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{value}</p>
      </div>
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}
