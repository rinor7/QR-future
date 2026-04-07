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
    <div className="pt-8 pb-12 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="space-y-2">
          <h2 className="text-[3.5rem] font-bold leading-tight tracking-tight font-headline text-on-surface">Team Access</h2>
          <p className="text-lg text-outline max-w-xl">Orchestrate your enterprise hierarchy. Control permissions, invite stakeholders, and manage organizational growth from one central hub.</p>
        </div>
        <div className="flex gap-4">
          <a href="/api/scan/export" download="members.csv" className="px-6 py-3 bg-surface-container-high text-primary font-semibold rounded-xl hover:bg-surface-container-highest transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">download</span>
            Export List
          </a>
          <button onClick={() => { setShowInviteModal(true); setInviteMsg(null); }} className="btn-primary px-6 py-3 font-bold rounded-xl shadow-xl flex items-center gap-2">
            <span className="material-symbols-outlined">person_add</span>
            {tr.users_invite_btn ?? "Invite Member"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Total Users", value: members.length, icon: "group", iconBg: "bg-blue-100", iconColor: "text-blue-700", badge: "+12%", badgeClass: "text-green-600 bg-green-100" },
          { label: "Admins", value: adminCount, icon: "verified_user", iconBg: "bg-purple-100", iconColor: "text-purple-700", badge: null, badgeClass: "" },
          { label: "Pending Invites", value: pendingCount, icon: "pending", iconBg: "bg-amber-100", iconColor: "text-amber-700", badge: null, badgeClass: "" },
          { label: "Inactive", value: 0, icon: "block", iconBg: "bg-red-100", iconColor: "text-red-700", badge: null, badgeClass: "" },
        ].map(({ label, value, icon, iconBg, iconColor, badge, badgeClass }) => (
          <div key={label} className="bg-surface-container-low p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-start">
              <span className={`p-2 ${iconBg} ${iconColor} rounded-lg material-symbols-outlined`}>{icon}</span>
              {badge && <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeClass}`}>{badge}</span>}
            </div>
            <div>
              <p className="text-outline text-sm font-medium">{label}</p>
              <p className="text-2xl font-bold font-headline">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm mb-16">
        <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low/30">
          <h3 className="text-xl font-bold font-headline">Current Team Members</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
              <span className="material-symbols-outlined text-outline">filter_list</span>
            </button>
            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors">
              <span className="material-symbols-outlined text-outline">sort</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs text-outline uppercase tracking-widest border-b border-outline-variant/10">
                <th className="px-8 py-5 font-semibold">User Details</th>
                <th className="px-8 py-5 font-semibold">Access Level</th>
                <th className="px-8 py-5 font-semibold">Status</th>
                <th className="px-8 py-5 font-semibold">Join Date</th>
                <th className="px-8 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-outline text-sm">{tr.users_no_members}</td>
                </tr>
              ) : (
                members.map((m, idx) => {
                  const isOwnerRow = m.userId === ownerId || m.role === "owner";
                  const isCurrentRow = m.userId === currentUserId;
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                  const roleBadgeClass = isOwnerRow
                    ? "bg-primary/10 text-primary"
                    : m.role === "admin"
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-high text-outline";
                  const roleLabel = isOwnerRow ? tr.role_owner : m.role === "admin" ? tr.role_admin : m.role === "writer" ? tr.role_writer : tr.role_reader;

                  return (
                    <tr key={m.userId} className="hover:bg-surface transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: avatarColor }}>
                            {getInitials(m.firstName ?? "", m.lastName ?? "", m.email)}
                          </div>
                          <div>
                            {(m.firstName || m.lastName) && (
                              <p className="font-bold text-on-surface">{`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()}</p>
                            )}
                            <p className="text-sm text-outline">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {isOwnerRow || isCurrentRow ? (
                          <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-tighter ${roleBadgeClass}`}>{roleLabel}</span>
                        ) : (
                          <select value={m.role} onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)} className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-tighter border-none focus:ring-2 focus:ring-primary ${roleBadgeClass}`}>
                            <option value="admin">{tr.role_admin}</option>
                            <option value="writer">{tr.role_writer}</option>
                            <option value="reader">{tr.role_reader}</option>
                          </select>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium text-on-surface">Active</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-outline">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="px-8 py-5 text-right">
                        {m.userId !== currentUserId && !isOwnerRow ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleResend(m.userId, m.email)} disabled={resendingId === m.userId} className="text-xs font-medium text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                              {resendMsg === m.userId ? tr.users_resend_success : resendingId === m.userId ? tr.users_resend_sending : tr.users_resend}
                            </button>
                            <button onClick={() => handleRemove(m.userId)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${removingId === m.userId ? "bg-error text-white" : "text-error hover:bg-error-container/30"}`}>
                              <Trash2 className="w-3 h-3" />
                              {removingId === m.userId ? tr.delete_confirm : tr.users_remove}
                            </button>
                          </div>
                        ) : (
                          <button className="p-2 text-outline hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-6 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
          <p className="text-sm text-outline font-medium">Showing <span className="text-on-surface">{members.length}</span> member{members.length !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-high text-outline font-bold rounded-lg hover:bg-surface-container-highest transition-colors opacity-50 cursor-not-allowed" disabled>Previous</button>
            <button className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-colors shadow-md shadow-primary/10">Next</button>
          </div>
        </div>
      </div>

      {/* Access Policy + Role Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-2xl font-bold font-headline">Access Policy</h3>
          <p className="text-outline leading-relaxed">Define the operational boundaries for your team. Each role comes with pre-configured permissions designed for enterprise security standards.</p>
          <div className="glass-panel p-6 rounded-xl border-l-4 border-primary">
            <h4 className="font-bold mb-2">Security Tip</h4>
            <p className="text-sm text-on-surface-variant">We recommend having at least two &apos;Owner&apos; level accounts for business continuity. Admins cannot delete other Admins.</p>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-low p-8 rounded-xl space-y-4">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <h4 className="text-xl font-bold font-headline">Admin Control</h4>
            <p className="text-sm text-outline leading-relaxed">Full access to billing, QR campaign management, and user orchestration. Perfect for department heads.</p>
            <ul className="space-y-2 pt-4">
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-green-500">check_circle</span> Create/Edit QRs</li>
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-green-500">check_circle</span> View Analytics</li>
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-green-500">check_circle</span> Invite Members</li>
            </ul>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl space-y-4">
            <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
            <h4 className="text-xl font-bold font-headline">Member Access</h4>
            <p className="text-sm text-outline leading-relaxed">Read-only or limited write access to specific folders. Ideal for external partners and contributors.</p>
            <ul className="space-y-2 pt-4">
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-green-500">check_circle</span> Edit Assigned QRs</li>
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-green-500">check_circle</span> View Assigned Reports</li>
              <li className="flex items-center gap-2 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-xs text-red-400">cancel</span> Invite Members</li>
            </ul>
          </div>
        </div>
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
