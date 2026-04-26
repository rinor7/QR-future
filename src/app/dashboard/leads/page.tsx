"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Mail, MessageSquare, Calendar, Search, Download, X, ExternalLink, Pencil, BarChart2, QrCode, MapPin, Monitor } from "lucide-react";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { useLang } from "@/lib/language";
import { useQRUrl } from "@/lib/qr-url";

type Lead = {
  id: string;
  name: string;
  email: string;
  comment: string | null;
  consent: boolean;
  created_at: string;
  contact_id: string;
  qr_label: string | null;
  contact_name: string | null;
  created_by: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  os: string | null;
};

type PreviewCard = {
  contact_id: string;
  qr_label: string | null;
  contact_name: string | null;
};

function QRPreviewModal({ card, onClose }: { card: PreviewCard; onClose: () => void }) {
  const { tr } = useLang();
  const buildQRUrl = useQRUrl();
  const cardUrl = buildQRUrl(card.contact_id);
  const label = card.qr_label || card.contact_name || card.contact_id;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[200px]">{label}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR code */}
        <div className="flex items-center justify-center py-8" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}>
          <div className="p-3 bg-white rounded-2xl shadow-xl">
            <QRCodeDisplay value={cardUrl} size={160} />
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-2.5">
          <a
            href={cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {tr.leads_open_live}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/dashboard/edit/${card.contact_id}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              {tr.leads_edit}
            </Link>
            <Link
              href={`/dashboard/analytics/${card.contact_id}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              {tr.leads_analytics}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { tr } = useLang();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<PreviewCard | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterByUser, setFilterByUser] = useState("all");
  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => { setLeads(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    getUserProfile().then(async (profile) => {
      if (!profile) return;
      const isAdminOrOwner = profile.role === "admin" || profile.userId === profile.ownerId;
      setIsAdmin(isAdminOrOwner);
      if (isAdminOrOwner) {
        const { data: members } = await getSupabaseBrowser()
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("owner_id", profile.ownerId);
        if (members) {
          const map: Record<string, string> = {};
          const list = members.map((m: { email: string; first_name: string | null; last_name: string | null }) => {
            const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
            map[m.email] = name;
            return { email: m.email, name };
          });
          setMemberMap(map);
          setTeamMembers(list);
        }
      }
    });
  }, []);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.qr_label ?? "").toLowerCase().includes(q) ||
      (l.contact_name ?? "").toLowerCase().includes(q);
    const matchesUser = filterByUser === "all" || l.created_by === filterByUser;
    return matchesSearch && matchesUser;
  });

  function exportCSV() {
    const rows = [["Name", "Email", "Comment", "QR Card", "Date", "City", "Country", "Device", "OS"]];
    filtered.forEach((l) => {
      rows.push([
        l.name,
        l.email,
        l.comment ?? "",
        l.qr_label || l.contact_name || l.contact_id,
        new Date(l.created_at).toISOString().replace("T", " ").slice(0, 16),
        l.city ?? "",
        l.country ?? "",
        l.device_type ?? "",
        l.os ?? "",
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 wide:p-8">
      {preview && <QRPreviewModal card={preview} onClose={() => setPreview(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.leads_title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tr.leads_subtitle}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          {tr.export_csv}
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={tr.leads_search_ph}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {isAdmin && teamMembers.length > 1 && (
          <select
            value={filterByUser}
            onChange={(e) => setFilterByUser(e.target.value)}
            className="bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{tr.leads_all_members}</option>
            {teamMembers.map((m) => (
              <option key={m.email} value={m.email}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-blue-500" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            {search ? tr.leads_none_search : tr.leads_none}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {!search && tr.leads_none_hint}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {filtered.length} {filtered.length !== 1 ? tr.leads_count_many : tr.leads_count_one}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((lead) => (
              <div key={lead.id} className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</span>
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  </div>
                  {lead.comment && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">{lead.comment}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {(lead.city || lead.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[lead.city, lead.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {(lead.device_type || lead.os) && (
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {[lead.device_type, lead.os].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {isAdmin && lead.created_by && (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        {memberMap[lead.created_by] || lead.created_by}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => setPreview({ contact_id: lead.contact_id, qr_label: lead.qr_label, contact_name: lead.contact_name })}
                    title={tr.leads_preview_qr}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/dashboard/edit/${lead.contact_id}`}
                    title={lead.qr_label || lead.contact_name || tr.leads_edit_card}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors max-w-[140px] truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{lead.qr_label || lead.contact_name || tr.leads_qr_card}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
