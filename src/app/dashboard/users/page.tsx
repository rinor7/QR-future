"use client";

import { useEffect, useState, useRef } from "react";
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

const AVATAR_COLORS = ["#003ec7", "#4459a8", "#16a34a", "#d97706", "#9333ea", "#0891b2"];

function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MemberStatus({ firstName, lastName }: { firstName: string; lastName: string }) {
  const isPending = !firstName && !lastName;
  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pending</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
    </div>
  );
}

interface RowMenuProps {
  memberId: string;
  memberEmail: string;
  memberRole: Role;
  isOwnerRow: boolean;
  isCurrentRow: boolean;
  removingId: string | null;
  resendingId: string | null;
  resendMsg: string | null;
  onRoleChange: (id: string, role: Role) => void;
  onResend: (id: string, email: string) => void;
  onRemove: (id: string) => void;
  tr: Record<string, string>;
}

function RowMenu({ memberId, memberEmail, memberRole, isOwnerRow, isCurrentRow, removingId, resendingId, resendMsg, onRoleChange, onResend, onRemove, tr }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-200 dark:border-[#242736] shadow-xl py-1 text-sm">
          {!isOwnerRow && !isCurrentRow && (
            <>
              <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Change Role</p>
              {(["admin", "writer", "reader"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { onRoleChange(memberId, r); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#242736] flex items-center gap-2 transition-colors ${memberRole === r ? "text-blue-600 font-semibold" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {memberRole === r && <span className="material-symbols-outlined text-[14px]">check</span>}
                  <span className={memberRole === r ? "" : "ml-5"}>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-[#242736] my-1" />
              <button
                onClick={() => { onResend(memberId, memberEmail); setOpen(false); }}
                disabled={resendingId === memberId}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#242736] text-slate-700 dark:text-slate-300 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">mail</span>
                {resendMsg === memberId ? "Sent!" : resendingId === memberId ? "Sending…" : tr.users_resend ?? "Resend Invite"}
              </button>
              <button
                onClick={() => { onRemove(memberId); setOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${removingId === memberId ? "text-red-600 font-semibold bg-red-50 dark:bg-red-900/20" : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"}`}
              >
                <span className="material-symbols-outlined text-[14px]">person_remove</span>
                {removingId === memberId ? "Click again to confirm" : tr.users_remove ?? "Remove"}
              </button>
            </>
          )}
          {(isOwnerRow || isCurrentRow) && (
            <p className="px-3 py-2 text-xs text-slate-400 italic">No actions available</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { tr } = useLang();
  const { loading: roleLoading } = useRole();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
      const [profile, team] = await Promise.all([getUserProfile(), getTeamMembers()]);
      setCurrentUserId(profile?.userId ?? "");
      setOwnerId(profile?.ownerId ?? "");
      setMembers(team);
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

  const adminCount = members.filter((m) => m.role === "admin" || m.role === "owner").length;
  const pendingCount = members.filter((m) => !m.firstName && !m.lastName).length;
  const restrictedCount = members.filter((m) => m.role === "reader").length;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pt-8 pb-12 px-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="space-y-2">
          <h2 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">Team Access</h2>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Orchestrate your enterprise hierarchy. Control permissions, invite stakeholders, and manage organizational growth from one central hub.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a
            href="/api/scan/export"
            download="members.csv"
            className="px-4 py-2.5 bg-white dark:bg-[#1a1d27] text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-200 dark:border-[#242736] hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export List
          </a>
          <button
            onClick={() => { setShowInviteModal(true); setInviteMsg(null); }}
            className="btn-primary px-4 py-2.5 font-semibold rounded-xl flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Invite Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Users",     value: members.length, icon: "group",         iconBg: "bg-blue-50 dark:bg-blue-900/20",   iconColor: "text-blue-600",   badge: members.length > 0 ? "+12%" : null },
          { label: "Admins",          value: adminCount,     icon: "verified_user", iconBg: "bg-purple-50 dark:bg-purple-900/20",iconColor: "text-purple-600", badge: null },
          { label: "Pending Invites", value: pendingCount,   icon: "schedule",      iconBg: "bg-amber-50 dark:bg-amber-900/20", iconColor: "text-amber-600",  badge: null },
          { label: "Restricted",      value: restrictedCount,icon: "lock",          iconBg: "bg-red-50 dark:bg-red-900/20",     iconColor: "text-red-500",    badge: null },
        ].map(({ label, value, icon, iconBg, iconColor, badge }) => (
          <div key={label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
              </div>
              {badge && (
                <span className="text-[11px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">{badge}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Team Members Table */}
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] overflow-hidden mb-10">
        {/* Table header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#242736]">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Current Team Members</h3>
          <div className="flex gap-1">
            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
              <span className="material-symbols-outlined text-[18px]">sort</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#242736]">
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Access Level</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#242736]">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">{tr.users_no_members}</td>
                </tr>
              ) : (
                members.map((m, idx) => {
                  const isOwnerRow = m.userId === ownerId || m.role === "owner";
                  const isCurrentRow = m.userId === currentUserId;
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                  const roleMeta = isOwnerRow
                    ? { label: "Owner",  cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" }
                    : m.role === "admin"
                    ? { label: "Admin",  cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" }
                    : m.role === "writer"
                    ? { label: "Writer", cls: "bg-slate-100 dark:bg-[#242736] text-slate-600 dark:text-slate-400" }
                    : { label: "Reader", cls: "bg-slate-100 dark:bg-[#242736] text-slate-600 dark:text-slate-400" };

                  return (
                    <tr key={m.userId} className="hover:bg-slate-50 dark:hover:bg-[#242736]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                            style={{ background: avatarColor }}
                          >
                            {getInitials(m.firstName ?? "", m.lastName ?? "", m.email)}
                          </div>
                          <div>
                            {(m.firstName || m.lastName) && (
                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()}
                              </p>
                            )}
                            <p className="text-xs text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${roleMeta.cls}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <MemberStatus firstName={m.firstName ?? ""} lastName={m.lastName ?? ""} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatJoinDate(m.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <RowMenu
                          memberId={m.userId}
                          memberEmail={m.email}
                          memberRole={m.role}
                          isOwnerRow={isOwnerRow}
                          isCurrentRow={isCurrentRow}
                          removingId={removingId}
                          resendingId={resendingId}
                          resendMsg={resendMsg}
                          onRoleChange={handleRoleChange}
                          onResend={handleResend}
                          onRemove={handleRemove}
                          tr={tr as Record<string, string>}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#242736] flex items-center justify-between bg-slate-50/50 dark:bg-[#242736]/20">
          <p className="text-sm text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{members.length}</span> member{members.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 text-sm font-semibold text-slate-400 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#242736] rounded-lg opacity-50 cursor-not-allowed">
              Previous
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Access Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: description + security tip */}
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Policy</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Define the operational boundaries for your team. Each role comes with pre-configured permissions designed for enterprise security standards.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-500 p-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">Security Tip</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We recommend having at least two administrator accounts for business continuity. Admins cannot delete themselves.
            </p>
          </div>
        </div>

        {/* Right: role cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Admin Control */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Admin Control</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Full authority to billing, QR campaign management, and user administration.
              </p>
            </div>
            <ul className="space-y-2 pt-1">
              {["Create/Edit QRs", "View Analytics", "Invite Members"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[14px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Member Access */}
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-purple-600" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Member Access</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Members have access to specific folders, ideal for external partners.
              </p>
            </div>
            <ul className="space-y-2 pt-1">
              {["Edit Assigned QRs", "View Assigned Reports", "Invite Colleagues"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[14px] text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-[#242736] shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#242736]">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">{tr.users_invite}</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors">
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
                  <option value="reader">{tr.role_reader}</option>
                  <option value="admin">{tr.role_admin}</option>
                </select>
              </div>
              {inviteMsg && (
                <p className={`text-sm ${inviteMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>{inviteMsg.text}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-[#242736] hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
                  {tr.delete_modal_cancel}
                </button>
                <button type="submit" disabled={inviting} className="flex-1 btn-primary disabled:opacity-50">
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
