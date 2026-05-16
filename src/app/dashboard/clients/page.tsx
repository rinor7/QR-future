"use client";

import { Fragment, useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { getUserProfile } from "@/lib/store";
import { ClientAccount, Plan, PLAN_LABELS } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Users, AlertTriangle, Eye, Lock, Mail, X, Copy, Check, Send, Loader2, ChevronRight } from "lucide-react";

const PLAN_COLORS: Record<Plan, string> = {
  free: "bg-gray-100 text-gray-600",
  growth: "bg-yellow-100 text-yellow-700",
  business: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function ClientsPage() {
  const { tr } = useLang();
  const router = useRouter();

  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ClientAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  function toggleExpand(ownerId: string) {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  }

  function fullName(first?: string, last?: string): string {
    return `${first ?? ""} ${last ?? ""}`.trim();
  }

  function ownerDisplayName(c: ClientAccount): string {
    return c.organizationName?.trim() || fullName(c.firstName, c.lastName) || "";
  }
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindSubject, setRemindSubject] = useState("");
  const [remindBody, setRemindBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendStatus, setSendStatus] = useState<Record<string, "sending" | "sent" | "failed">>({});
  const [sendError, setSendError] = useState<Record<string, string>>({});
  const [sendingAll, setSendingAll] = useState(false);

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
  const isStale = (lastActivityAt?: string | null) => {
    if (!lastActivityAt) return true;
    const days = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > INACTIVITY_DAYS;
  };

  type InactiveItem = {
    userId: string;
    email: string;
    lastActivityAt?: string | null;
    isSub: boolean;
    ownerEmail?: string;
    ownerName?: string;
  };

  const inactiveItems: InactiveItem[] = [];
  for (const c of clients) {
    if (isStale(c.lastActivityAt)) {
      inactiveItems.push({
        userId: c.userId,
        email: c.email,
        lastActivityAt: c.lastActivityAt,
        isSub: false,
      });
    }
    for (const sub of c.subUsers ?? []) {
      if (isStale(sub.lastActivityAt)) {
        inactiveItems.push({
          userId: sub.userId,
          email: sub.email,
          lastActivityAt: sub.lastActivityAt,
          isSub: true,
          ownerEmail: c.email,
          ownerName: ownerDisplayName(c),
        });
      }
    }
  }

  function daysInactiveFor(lastActivityAt?: string | null): number | null {
    if (!lastActivityAt) return null;
    return Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  function toggleSelect(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === inactiveItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(inactiveItems.map((c) => c.userId)));
  }

  function openReminderModal() {
    setRemindSubject(tr.clients_remind_subject_default);
    setRemindBody(tr.clients_remind_body_default);
    setRemindOpen(true);
  }

  function fillPlaceholders(template: string, c: InactiveItem): string {
    const days = daysInactiveFor(c.lastActivityAt);
    return template
      .replace(/\{email\}/g, c.email)
      .replace(/\{days\}/g, days === null ? "0" : String(days))
      .replace(/\{last_active\}/g, c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleDateString() : tr.clients_remind_never);
  }

  function buildPayload(targets: InactiveItem[]) {
    return targets.map((c) => ({
      email: c.email,
      subject: fillPlaceholders(remindSubject, c),
      body: fillPlaceholders(remindBody, c),
    }));
  }

  async function sendOne(c: InactiveItem) {
    setSendStatus((s) => ({ ...s, [c.userId]: "sending" }));
    setSendError((s) => { const n = { ...s }; delete n[c.userId]; return n; });
    try {
      const res = await fetch("/api/admin/clients/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: buildPayload([c]) }),
      });
      const data = await res.json();
      const r = data?.results?.[0];
      if (r?.ok) {
        setSendStatus((s) => ({ ...s, [c.userId]: "sent" }));
      } else {
        setSendStatus((s) => ({ ...s, [c.userId]: "failed" }));
        setSendError((s) => ({ ...s, [c.userId]: r?.error || data?.error || "Send failed" }));
      }
    } catch (e: unknown) {
      setSendStatus((s) => ({ ...s, [c.userId]: "failed" }));
      setSendError((s) => ({ ...s, [c.userId]: e instanceof Error ? e.message : "Send failed" }));
    }
  }

  async function sendAllSelected() {
    const selected = inactiveItems.filter((c) => selectedIds.has(c.userId));
    if (selected.length === 0) return;
    setSendingAll(true);
    const initial: Record<string, "sending"> = {};
    selected.forEach((c) => { initial[c.userId] = "sending"; });
    setSendStatus((s) => ({ ...s, ...initial }));
    try {
      const res = await fetch("/api/admin/clients/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: buildPayload(selected) }),
      });
      const data = await res.json();
      const results: { email: string; ok: boolean; error?: string }[] = data?.results ?? [];
      const next: Record<string, "sent" | "failed"> = {};
      const errs: Record<string, string> = {};
      for (const c of selected) {
        const r = results.find((x) => x.email === c.email);
        if (r?.ok) next[c.userId] = "sent";
        else { next[c.userId] = "failed"; errs[c.userId] = r?.error || data?.error || "Send failed"; }
      }
      setSendStatus((s) => ({ ...s, ...next }));
      setSendError((s) => ({ ...s, ...errs }));
    } catch (e: unknown) {
      const errs: Record<string, string> = {};
      const failed: Record<string, "failed"> = {};
      selected.forEach((c) => {
        failed[c.userId] = "failed";
        errs[c.userId] = e instanceof Error ? e.message : "Send failed";
      });
      setSendStatus((s) => ({ ...s, ...failed }));
      setSendError((s) => ({ ...s, ...errs }));
    } finally {
      setSendingAll(false);
    }
  }

  async function copyAllAddresses() {
    const selected = inactiveItems.filter((c) => selectedIds.has(c.userId));
    const list = (selected.length ? selected : inactiveItems).map((c) => c.email).join(", ");
    await navigator.clipboard.writeText(list);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Stats
  const planCounts = clients.reduce<Record<Plan, number>>(
    (acc, c) => { acc[c.plan] = (acc[c.plan] ?? 0) + 1; return acc; },
    { free: 0, growth: 0, business: 0, enterprise: 0 }
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{clients.length}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{tr.clients_stat_total}</p>
        </div>
        {(["free", "growth", "business", "enterprise"] as Plan[]).map((plan) => (
          <div key={plan} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-100 dark:border-[#242736] shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{planCounts[plan]}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${PLAN_COLORS[plan]}`}>
              {PLAN_LABELS[plan]}
            </span>
          </div>
        ))}
      </div>

      {/* Inactivity notification */}
      {inactiveItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">{tr.clients_inactive_title} ({inactiveItems.length})</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="text-xs font-medium text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                {tr.clients_remind_select_all} ({selectedIds.size}/{inactiveItems.length})
              </button>
              <button
                onClick={openReminderModal}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {tr.clients_remind_selected}
              </button>
            </div>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300/90 mb-4">{tr.clients_inactive_body.replace("{days}", String(INACTIVITY_DAYS))}</p>
          <div className="flex flex-col gap-2">
            {inactiveItems.map((c) => {
              const checked = selectedIds.has(c.userId);
              return (
                <label
                  key={c.userId}
                  className={`flex items-center justify-between bg-white dark:bg-[#1a1d27] rounded-xl border px-4 py-2.5 cursor-pointer transition-colors ${checked ? "border-amber-400 dark:border-amber-500/60" : "border-amber-100 dark:border-amber-700/30 hover:border-amber-200"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(c.userId)}
                      className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0"
                    />
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-slate-200 font-medium truncate">{c.email}</p>
                      {c.isSub && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300/80 truncate">
                          {tr.clients_via_owner} {c.ownerName ? `${c.ownerName} · ` : ""}{c.ownerEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 ml-3">
                    {c.lastActivityAt
                      ? `${tr.clients_last_active}: ${new Date(c.lastActivityAt).toLocaleDateString()}`
                      : tr.clients_never_active}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-100 dark:border-[#242736] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
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
              clients.map((c) => {
                const expanded = expandedOwners.has(c.userId);
                const subs = c.subUsers ?? [];
                const ownerName = ownerDisplayName(c);
                return (
                  <Fragment key={c.userId}>
                    <tr className="border-b border-gray-50 dark:border-[#242736] last:border-0 hover:bg-gray-50 dark:hover:bg-[#242736]/50">
                      {/* Avatar + email + name/company */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {subs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(c.userId)}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#242736] transition-colors"
                              title={expanded ? "Collapse" : "Expand"}
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                            </button>
                          ) : (
                            <span className="w-6 h-6 shrink-0" />
                          )}
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {c.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            {ownerName && (
                              <p className="text-sm text-gray-900 dark:text-slate-100 font-semibold truncate">{ownerName}</p>
                            )}
                            <p className={`text-gray-700 dark:text-slate-300 truncate ${ownerName ? "text-xs" : "text-sm font-medium"}`}>{c.email}</p>
                          </div>
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          {tr.clients_view}
                        </Link>
                      </td>
                      {/* Delete */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => { setDeleteTarget(c); setDeleteConfirmText(""); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          {tr.clients_delete}
                        </button>
                      </td>
                    </tr>
                    {expanded && subs.map((s) => {
                      const subName = fullName(s.firstName, s.lastName);
                      return (
                        <tr key={s.userId} className="border-b border-gray-50 dark:border-[#242736] last:border-0 bg-gray-50/40 dark:bg-[#242736]/20">
                          <td className="px-6 py-3" colSpan={6}>
                            <div className="flex items-center gap-3 pl-12">
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {s.email[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                {subName && (
                                  <p className="text-sm text-gray-800 dark:text-slate-200 font-medium truncate">{subName}</p>
                                )}
                                <p className={`text-gray-600 dark:text-slate-400 truncate ${subName ? "text-xs" : "text-sm"}`}>{s.email}</p>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                                {s.role}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                                {new Date(s.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Delete client confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete client account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{deleteTarget.email}</p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/15 rounded-xl p-4 mb-4 border border-red-100 dark:border-red-700/40">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                This permanently deletes their entire organisation. Unrecoverable.
              </p>
              <ul className="text-sm text-red-800 dark:text-red-200/90 space-y-1 list-disc list-inside">
                <li>All their QR codes ({deleteTarget.qrCount})</li>
                <li>Every scan & interaction log</li>
                <li>Every lead captured</li>
                <li>Every folder and permission</li>
                <li>Every sub-user account under their org</li>
                <li>The login itself — nobody can sign back in</li>
              </ul>
            </div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
              This cannot be undone. No restore, no refund, no backup.
            </p>
            <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Type <span className="text-red-500 font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-900 dark:text-slate-100 mb-5"
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
                className="px-5 py-3 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder email modal */}
      {remindOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-[#1a1d27] border-b border-slate-100 dark:border-[#242736] px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tr.clients_remind_modal_title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tr.clients_remind_modal_hint}</p>
                </div>
              </div>
              <button
                onClick={() => setRemindOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#242736] border border-slate-100 dark:border-[#2a2e3e] rounded-xl px-4 py-2.5">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>{tr.clients_remind_from}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {tr.clients_remind_subject_label}
                </label>
                <input
                  type="text"
                  value={remindSubject}
                  onChange={(e) => setRemindSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {tr.clients_remind_body_label}
                </label>
                <textarea
                  value={remindBody}
                  onChange={(e) => setRemindBody(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-slate-100 font-mono leading-relaxed resize-y"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {tr.clients_remind_recipients} ({selectedIds.size})
                  </label>
                  <button
                    onClick={copyAllAddresses}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242736] px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? tr.clients_remind_copied : tr.clients_remind_copy_all}
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {inactiveItems.filter((c) => selectedIds.has(c.userId)).map((c) => {
                    const d = daysInactiveFor(c.lastActivityAt);
                    const status = sendStatus[c.userId];
                    const err = sendError[c.userId];
                    return (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#242736] rounded-xl px-4 py-2.5 border border-slate-100 dark:border-[#2a2e3e]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {c.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate">{c.email}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {d === null ? tr.clients_remind_never : `${d} ${tr.clients_remind_days_inactive}`}
                              {status === "failed" && err ? ` — ${err}` : ""}
                            </p>
                          </div>
                        </div>
                        {status === "sent" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-xs font-semibold shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            {tr.clients_remind_sent}
                          </span>
                        ) : (
                          <button
                            onClick={() => sendOne(c)}
                            disabled={status === "sending" || sendingAll}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors text-white ${status === "failed" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {status === "sending" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {status === "sending"
                              ? tr.clients_remind_sending
                              : status === "failed"
                              ? tr.clients_remind_retry
                              : tr.clients_remind_send}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-[#1a1d27] border-t border-slate-100 dark:border-[#242736] px-8 py-4 flex justify-end gap-2">
              <button
                onClick={() => setRemindOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors"
              >
                {tr.clients_remind_close}
              </button>
              <button
                onClick={sendAllSelected}
                disabled={sendingAll || selectedIds.size === 0}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingAll ? tr.clients_remind_sending : `${tr.clients_remind_send_all} (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
