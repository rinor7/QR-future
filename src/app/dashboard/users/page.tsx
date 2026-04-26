"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getTeamMembers, updateTeamMemberRole, getUserProfile } from "@/lib/store";
import { TeamMember, Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

function getInitials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Floating dropdown rendered in a portal so overflow:hidden never clips it ── */
interface DropdownProps {
  anchor: DOMRect;
  memberId: string;
  memberEmail: string;
  memberRole: Role;
  memberConfirmed: boolean;
  isOwnerRow: boolean;
  isCurrentRow: boolean;
  removingId: string | null;
  resendingId: string | null;
  resendMsg: string | null;
  onRoleChange: (id: string, role: Role) => void;
  onResend: (id: string, email: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  tr: Record<string, string>;
}

function FloatingDropdown({ anchor, memberId, memberEmail, memberRole, memberConfirmed, isOwnerRow, isCurrentRow, removingId, resendingId, resendMsg, onRoleChange, onResend, onRemove, onClose, tr }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleScroll() { onClose(); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const top = anchor.bottom + 4;
  const right = window.innerWidth - anchor.right;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, right, zIndex: 9999 }}
      className="w-52 bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-200 dark:border-[#242736] shadow-2xl py-1 text-sm"
    >
      {!isOwnerRow ? (
        <>
          {!isCurrentRow && (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Change Role</p>
              {(["admin", "writer"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { onRoleChange(memberId, r); onClose(); }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#242736] flex items-center gap-2 transition-colors ${memberRole === r ? "text-blue-600 font-semibold" : "text-slate-700 dark:text-slate-300"}`}
                >
                  <span className={`material-symbols-outlined text-[14px] ${memberRole === r ? "opacity-100" : "opacity-0"}`}>check</span>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-[#242736] my-1" />
            </>
          )}
          {!memberConfirmed && (
            <button
              onClick={() => { onResend(memberId, memberEmail); onClose(); }}
              disabled={resendingId === memberId}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#242736] text-slate-700 dark:text-slate-300 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">mail</span>
              {resendMsg === memberId ? "Sent!" : resendingId === memberId ? "Sending…" : tr.users_resend ?? "Resend Invite"}
            </button>
          )}
          {!isCurrentRow && (
            <button
              onClick={() => { onRemove(memberId); if (removingId === memberId) onClose(); }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${removingId === memberId ? "text-red-600 font-semibold bg-red-50 dark:bg-red-900/20" : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"}`}
            >
              <span className="material-symbols-outlined text-[14px]">person_remove</span>
              {removingId === memberId ? "Confirm remove" : tr.users_remove ?? "Remove"}
            </button>
          )}
        </>
      ) : (
        <p className="px-3 py-2 text-xs text-slate-400 italic">No actions available</p>
      )}
    </div>,
    document.body
  );
}

/* ── Main Page ── */
export default function UsersPage() {
  const { tr } = useLang();
  const { loading: roleLoading } = useRole();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("writer");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;
    getUserProfile().then((p) => {
      if (!p || p.isPlatformAdmin || (p.role !== "owner" && p.role !== "admin")) {
        router.replace("/dashboard");
        return;
      }
      load();
    });
  }, [roleLoading, router]);

  async function load() {
    setLoading(true);
    try {
      const [profile, team, confirmationRes] = await Promise.all([
        getUserProfile(),
        getTeamMembers(),
        fetch("/api/users/confirmation").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      setCurrentUserId(profile?.userId ?? "");
      setOwnerId(profile?.ownerId ?? "");
      const confirmation = confirmationRes as Record<string, boolean>;
      setMembers(team.map((m) => ({ ...m, confirmed: !!confirmation[m.userId] })));
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const profile = await getUserProfile();
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, ownerId: profile?.ownerId, firstName: inviteFirstName, lastName: inviteLastName }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        setInviteMsg({ type: "error", text: error || tr.users_invite_error });
      } else {
        setInviteMsg({ type: "success", text: tr.users_invite_success });
        setInviteEmail(""); setInviteFirstName(""); setInviteLastName("");
        setShowInviteModal(false);
        await load();
      }
    } catch {
      setInviteMsg({ type: "error", text: tr.users_invite_error });
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: Role) {
    await updateTeamMemberRole(memberId, role);
    setMembers((prev) => prev.map((m) => m.userId === memberId ? { ...m, role } : m));
  }

  async function handleRemove(memberId: string) {
    if (removingId === memberId) {
      const res = await fetch("/api/users/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: memberId }) });
      if (!res.ok) {
        const { error } = await res.json();
        setInviteMsg({ type: "error", text: error ?? "Remove failed" });
        setRemovingId(null);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
      setRemovingId(null);
    } else {
      setRemovingId(memberId);
      setTimeout(() => setRemovingId(null), 3000);
    }
  }

  async function handleResend(memberId: string, email: string) {
    setResendingId(memberId);
    const profile = await getUserProfile();
    await fetch("/api/users/resend-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ownerId: profile?.ownerId }) });
    setResendingId(null);
    setResendMsg(memberId);
    setTimeout(() => setResendMsg(null), 3000);
  }

  function handleExportCsv() {
    const headers = ["First Name", "Last Name", "Email", "Role", "Status", "Joined"];
    const rows = members.map((m) => {
      const isOwnerRow = m.userId === ownerId || m.role === "owner";
      const role = isOwnerRow ? tr.role_owner : m.role === "admin" ? tr.role_admin : tr.role_writer;
      const status = m.confirmed === false ? "Pending" : "Active";
      return [m.firstName ?? "", m.lastName ?? "", m.email ?? "", role, status, m.createdAt ? new Date(m.createdAt).toISOString() : ""];
    });
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const closeMenu = useCallback(() => { setOpenMenuId(null); setMenuAnchor(null); }, []);

  function toggleMenu(memberId: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openMenuId === memberId) { closeMenu(); return; }
    setMenuAnchor(e.currentTarget.getBoundingClientRect());
    setOpenMenuId(memberId);
  }

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);

  const adminCount      = members.filter((m) => m.role === "admin" || m.role === "owner").length;
  const pendingCount    = members.filter((m) => m.confirmed === false).length;
  const totalPages      = Math.ceil(members.length / PAGE_SIZE);
  const paginatedMembers = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openMember = openMenuId ? members.find((m) => m.userId === openMenuId) : null;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-8 px-6 lg:px-10 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{tr.users_team_access}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg leading-relaxed">
            {tr.users_team_subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportCsv}
            disabled={members.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#242736] rounded-xl hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            {tr.users_export_list}
          </button>
          <button
            onClick={() => { setShowInviteModal(true); setInviteMsg(null); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            {tr.users_invite_member}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: tr.users_stat_total,      value: members.length, icon: "group",         bg: "bg-blue-50 dark:bg-blue-900/20",    color: "text-blue-600",   badge: "+12%", badgeCls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
          { label: tr.users_stat_admins,     value: adminCount,     icon: "verified_user", bg: "bg-violet-50 dark:bg-violet-900/20",color: "text-violet-600", badge: null,   badgeCls: "" },
          { label: tr.users_stat_pending,    value: pendingCount,   icon: "schedule",      bg: "bg-amber-50 dark:bg-amber-900/20",  color: "text-amber-500",  badge: null,   badgeCls: "" },
        ].map(({ label, value, icon, bg, color, badge, badgeCls }) => (
          <div key={label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
              </div>
              {badge && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{badge}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] mb-8 shadow-sm">

        {/* Table title bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#242736]">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{tr.users_table_title}</h3>
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
              <span className="material-symbols-outlined text-[18px]">sort</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#242736]">
                {[tr.users_col_user, tr.users_col_access, tr.users_col_status, tr.users_col_join, tr.users_col_actions].map((h, i) => (
                  <th key={h} className={`px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">{tr.users_no_members}</td>
                </tr>
              ) : (
                paginatedMembers.map((m, idx) => {
                  const isOwnerRow = m.userId === ownerId || m.role === "owner";
                  const isPending    = m.confirmed === false;
                  const avatarColor  = AVATAR_COLORS[(page * PAGE_SIZE + idx) % AVATAR_COLORS.length];

                  const roleMeta = isOwnerRow
                    ? { label: tr.role_owner,  cls: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20" }
                    : m.role === "admin"
                    ? { label: tr.role_admin,  cls: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20" }
                    : { label: tr.role_writer, cls: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#242736]" };

                  return (
                    <tr key={m.userId} className="border-b border-slate-50 dark:border-[#242736] last:border-0 hover:bg-slate-50/60 dark:hover:bg-[#242736]/40 transition-colors">

                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avatarColor }}>
                            {getInitials(m.firstName ?? "", m.lastName ?? "", m.email)}
                          </div>
                          <div className="min-w-0">
                            {(m.firstName || m.lastName) && (
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 truncate">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${roleMeta.cls}`}>
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isPending ? "bg-amber-400" : "bg-emerald-500"}`} />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{isPending ? "Pending" : "Active"}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatJoinDate(m.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleResend(m.userId, m.email)}
                              disabled={resendingId === m.userId}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-[13px]">mail</span>
                              {resendMsg === m.userId ? "Sent!" : resendingId === m.userId ? "Sending…" : "Resend invite"}
                            </button>
                          )}
                          {!isOwnerRow && (
                            <button
                              onClick={(e) => toggleMenu(m.userId, e)}
                              className={`p-1.5 rounded-lg transition-colors ${openMenuId === m.userId ? "bg-slate-100 dark:bg-[#242736] text-slate-700 dark:text-slate-200" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242736]"}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#242736] flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, members.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{members.length}</span>{" "}
            member{members.length !== 1 ? "s" : ""}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2e3e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating dropdown portal ── */}
      {openMenuId && menuAnchor && openMember && (
        <FloatingDropdown
          anchor={menuAnchor}
          memberId={openMember.userId}
          memberEmail={openMember.email}
          memberRole={openMember.role}
          memberConfirmed={!!openMember.confirmed}
          isOwnerRow={openMember.userId === ownerId || openMember.role === "owner"}
          isCurrentRow={openMember.userId === currentUserId}
          removingId={removingId}
          resendingId={resendingId}
          resendMsg={resendMsg}
          onRoleChange={handleRoleChange}
          onResend={handleResend}
          onRemove={handleRemove}
          onClose={closeMenu}
          tr={tr as Record<string, string>}
        />
      )}

      {/* ── Access Policy ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{tr.role_perm_title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.role_perm_subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Owner */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-violet-600" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tr.role_owner}</h4>
                <p className="text-[10px] text-slate-400">{tr.role_perm_owner_subtitle}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {[
                tr.role_perm_create_edit_delete_restore,
                tr.role_perm_view_analytics,
                tr.role_perm_manage_folders,
                tr.role_perm_invite_members,
                tr.role_perm_apply_templates,
                tr.role_perm_manage_settings,
                tr.role_perm_manage_plan,
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[13px] text-emerald-500 mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Admin */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tr.role_admin}</h4>
                <p className="text-[10px] text-slate-400">{tr.role_perm_admin_subtitle}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {[
                [tr.role_perm_create_edit_delete, true],
                [tr.role_perm_view_analytics, true],
                [tr.role_perm_manage_folders, true],
                [tr.role_perm_invite_members, true],
                [tr.role_perm_apply_templates, true],
                [tr.role_perm_manage_settings, true],
                [tr.role_perm_manage_plan, false],
              ].map(([item, allowed]) => (
                <li key={item as string} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className={`material-symbols-outlined text-[13px] mt-0.5 shrink-0 ${allowed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {allowed ? "check_circle" : "cancel"}
                  </span>
                  <span className={allowed ? "" : "text-slate-400 dark:text-slate-600"}>{item as string}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Editor (DB role: writer) */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-teal-600" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{tr.role_writer}</h4>
                <p className="text-[10px] text-slate-400">{tr.role_perm_writer_subtitle}</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {[
                [tr.role_perm_create_edit, true],
                [tr.role_perm_view_analytics, true],
                [tr.role_perm_manage_folders, true],
                [tr.role_perm_apply_templates, true],
                [tr.role_perm_delete_qrs, false],
                [tr.role_perm_invite_members_no, false],
                [tr.role_perm_access_settings, false],
              ].map(([item, allowed]) => (
                <li key={item as string} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className={`material-symbols-outlined text-[13px] mt-0.5 shrink-0 ${allowed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {allowed ? "check_circle" : "cancel"}
                  </span>
                  <span className={allowed ? "" : "text-slate-400 dark:text-slate-600"}>{item as string}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#242736]">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">{tr.users_invite}</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{tr.field_first_name}</label>
                  <input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder={tr.field_first_name} className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{tr.field_last_name}</label>
                  <input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder={tr.field_last_name} className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{tr.users_invite_email}</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="writer">{tr.role_writer}</option>
                  <option value="admin">{tr.role_admin}</option>
                </select>
              </div>
              {inviteMsg && (
                <p className={`text-sm ${inviteMsg.type === "success" ? "text-emerald-600" : "text-red-500"}`}>{inviteMsg.text}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#242736] hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={inviting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {inviting ? tr.users_invite_sending : tr.users_invite_btn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
