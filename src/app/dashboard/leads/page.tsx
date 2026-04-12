"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { UserPlus, Mail, MessageSquare, Calendar, Search, Download } from "lucide-react";

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
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const profile = await getUserProfile();
      if (!profile) return;
      const ownerId = profile.ownerId ?? profile.userId;

      const supabase = getSupabaseBrowser();

      // Get all contacts for this org to join with leads
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, qr_label")
        .eq("user_id", ownerId);

      const contactMap: Record<string, { name: string; qr_label: string }> = {};
      (contacts ?? []).forEach((c) => {
        contactMap[c.id] = { name: c.name, qr_label: c.qr_label };
      });

      const contactIds = Object.keys(contactMap);
      if (contactIds.length === 0) { setLoading(false); return; }

      const { data: rawLeads } = await supabase
        .from("qr_leads")
        .select("id, name, email, comment, consent, created_at, contact_id")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });

      const mapped: Lead[] = (rawLeads ?? []).map((l) => ({
        ...l,
        qr_label: contactMap[l.contact_id]?.qr_label || null,
        contact_name: contactMap[l.contact_id]?.name || null,
      }));

      setLeads(mapped);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.qr_label ?? "").toLowerCase().includes(q) ||
      (l.contact_name ?? "").toLowerCase().includes(q)
    );
  });

  function exportCSV() {
    const rows = [["Name", "Email", "Comment", "QR Card", "Date"]];
    filtered.forEach((l) => {
      rows.push([
        l.name,
        l.email,
        l.comment ?? "",
        l.qr_label || l.contact_name || l.contact_id,
        new Date(l.created_at).toISOString().slice(0, 10),
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Contacts submitted via your QR cards
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email or QR card…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
            {search ? "No leads match your search" : "No leads yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {!search && "Enable Lead Capture on a QR card to start collecting contacts."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((lead) => (
              <div key={lead.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</span>
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1 text-blue-600 text-xs hover:underline"
                    >
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </a>
                  </div>
                  {lead.comment && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">{lead.comment}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-xs text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg font-medium">
                      {lead.qr_label || lead.contact_name || lead.contact_id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
