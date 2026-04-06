"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getTeamMembers, updateTeamMemberRole, getUserProfile } from "@/lib/store";
import { TeamMember, Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Download, Shield, Users, Clock, UserX, X } from "lucide-react";

function getInitials(firstName: string, lastName: string, email: string) {
  if (firstName || lastName) return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

const AVATAR_COLORS = ["#003ec7", "#4459a8", "#16a34a", "#d97706", "#9333ea", "#0891b2"];

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
  const pendingCount = 0;
  const inputStyle = { border: "1px solid rgba(195,197,217,0.5)" };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 wide:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-brand-text">{tr.users_title}</h1>
          <p className="text-brand-outline mt-1 max-w-lg">{tr.users_subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/scan/export"
            download="members.csv"
            className="flex items-center gap-2 bg-brand-surface text-brand-text-secondary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-brand-surface-low shadow-ambient-sm"
            style={inputStyle}
          >
            <Download className="w-4 h-4" />
            {tr.export_csv ?? "Export List"}
          </a>
          <button
            onClick={() => { setShowInviteModal(true); setInviteMsg(null); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            {tr.users_invite_btn ?? "Invite Member"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users",    value: members.length, icon: Users,    color: "#003ec7", bg: "rgba(0,62,199,0.08)" },
          { label: "Admins",         value: adminCount,     icon: Shield,   color: "#9333ea", bg: "rgba(147,51,234,0.08)" },
          { label: "Pending Invites",value: pendingCount,   icon: Clock,    color: "#d97706", bg: "rgba(217,119,6,0.08)" },
          { label: "Inactive",       value: 0,              icon: UserX,    color: "#737688", bg: "rgba(115,118,136,0.08)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-brand-surface rounded-2xl p-4 shadow-ambient-sm flex items-center gap-3" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="font-headline font-bold text-2xl text-brand-text">{value}</p>
              <p className="text-xs text-brand-outline">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div className="bg-brand-surface rounded-2xl overflow-hidden shadow-ambient-sm mb-6" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-brand-outline uppercase tracking-wide" style={{ background: "#f7f9fb", borderBottom: "1px solid rgba(195,197,217,0.35)" }}>
              <th className="text-left px-6 py-3">{tr.users_col_email}</th>
              <th className="text-left px-6 py-3">Access Level</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">{tr.users_col_joined}</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-brand-outline text-sm">{tr.users_no_members}</td>
              </tr>
            ) : (
              members.map((m, idx) => {
                const isOwnerRow = m.userId === ownerId || m.role === "owner";
                const isCurrentRow = m.userId === currentUserId;
                const confirmed = true;
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                const roleBadge = isOwnerRow
                  ? { bg: "rgba(107,33,168,0.1)", text: "#6b21a8", label: tr.role_owner }
                  : m.role === "admin"
                  ? { bg: "rgba(0,62,199,0.1)", text: "#003ec7", label: tr.role_admin }
                  : m.role === "writer"
                  ? { bg: "rgba(22,163,74,0.1)", text: "#16a34a", label: tr.role_writer }
                  : { bg: "rgba(115,118,136,0.1)", text: "#737688", label: tr.role_reader };

                const statusBadge = confirmed
                  ? { dot: "#16a34a", text: "#16a34a", bg: "rgba(22,163,74,0.08)", label: "Active" }
                  : { dot: "#d97706", text: "#d97706", bg: "rgba(217,119,6,0.08)", label: "Pending" };

                return (
                  <tr key={m.userId} className="hover:bg-brand-bg transition-colors" style={{ borderBottom: idx < members.length - 1 ? "1px solid rgba(195,197,217,0.25)" : "none" }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avatarColor }}>
                          {getInitials(m.firstName ?? "", m.lastName ?? "", m.email)}
                        </div>
                        <div>
                          {(m.firstName || m.lastName) && (
                            <p className="text-brand-text font-semibold text-sm">{`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()}</p>
                          )}
                          <p className="text-brand-outline text-xs">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOwnerRow || isCurrentRow ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: roleBadge.bg, color: roleBadge.text }}>
                          {roleBadge.label}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-text-secondary"
                          style={{ border: "1px solid rgba(195,197,217,0.5)" }}
                        >
                          <option value="admin">{tr.role_admin}</option>
                          <option value="writer">{tr.role_writer}</option>
                          <option value="reader">{tr.role_reader}</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: statusBadge.bg, color: statusBadge.text }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusBadge.dot }} />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-brand-outline text-xs">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {m.userId !== currentUserId && !isOwnerRow && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResend(m.userId, m.email)}
                            disabled={resendingId === m.userId}
                            className="text-xs font-medium text-brand-primary hover:bg-brand-surface-low px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resendMsg === m.userId ? tr.users_resend_success : resendingId === m.userId ? tr.users_resend_sending : tr.users_resend}
                          </button>
                          <button
                            onClick={() => handleRemove(m.userId)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${removingId === m.userId ? "bg-brand-error text-white" : "text-brand-error hover:bg-brand-error-container"}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {removingId === m.userId ? tr.delete_confirm : tr.users_remove}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {members.length > 0 && (
          <div className="px-6 py-3 text-xs text-brand-outline" style={{ borderTop: "1px solid rgba(195,197,217,0.25)" }}>
            Showing {members.length} member{members.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Bottom info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Access Policy", desc: "Define the operations teammates can perform on QR codes. Pre-configured permission sets designed for enterprise security standards.", icon: Shield, color: "#003ec7", bg: "rgba(0,62,199,0.08)" },
          { title: "Admin Control", desc: "Campaign managers and QR code administrators. Create/delete QR codes and manage user access.", icon: Shield, color: "#9333ea", bg: "rgba(147,51,234,0.08)" },
          { title: "Member Access", desc: "Write access to specific QR codes. View analytics and reports assigned to their role.", icon: Users, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
        ].map(({ title, desc, icon: Icon, color, bg }) => (
          <div key={title} className="bg-brand-surface rounded-2xl p-5 shadow-ambient-sm" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4.5 h-4.5" style={{ color, width: "18px", height: "18px" }} />
            </div>
            <h3 className="font-headline font-semibold text-brand-text text-sm mb-1">{title}</h3>
            <p className="text-xs text-brand-outline leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-surface rounded-2xl shadow-ambient w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(195,197,217,0.3)" }}>
              <h2 className="font-headline font-bold text-brand-text">{tr.users_invite}</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 text-brand-outline hover:text-brand-text rounded-xl hover:bg-brand-surface-low transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1.5">{tr.field_first_name}</label>
                  <input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder={tr.field_first_name} className="w-full bg-brand-bg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text" style={{ border: "1px solid rgba(195,197,217,0.5)" }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1.5">{tr.field_last_name}</label>
                  <input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder={tr.field_last_name} className="w-full bg-brand-bg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text" style={{ border: "1px solid rgba(195,197,217,0.5)" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1.5">{tr.users_invite_email}</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={tr.users_invite_email} className="w-full bg-brand-bg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text" style={{ border: "1px solid rgba(195,197,217,0.5)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-outline uppercase tracking-wide mb-1.5">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="w-full bg-brand-bg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-text-secondary" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
                  <option value="writer">{tr.role_writer}</option>
                  <option value="reader">{tr.role_reader}</option>
                  <option value="admin">{tr.role_admin}</option>
                </select>
              </div>
              {inviteMsg && (
                <p className={`text-sm ${inviteMsg.type === "success" ? "text-green-600" : "text-brand-error"}`}>{inviteMsg.text}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 text-brand-text-secondary py-2.5 rounded-xl text-sm font-medium hover:bg-brand-surface-low transition-colors" style={{ border: "1px solid rgba(195,197,217,0.5)" }}>
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
