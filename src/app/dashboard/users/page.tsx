"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getTeamMembers, updateTeamMemberRole, getUserProfile } from "@/lib/store";
import { TeamMember, Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2 } from "lucide-react";

export default function UsersPage() {
  const { tr } = useLang();
  const { loading: roleLoading } = useRole();
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
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
      const res = await fetch("/api/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      });
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
    await fetch("/api/users/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ownerId: profile?.ownerId }),
    });
    setResendingId(null);
    setResendMsg(memberId);
    setTimeout(() => setResendMsg(null), 3000);
  }

  const roleLabel = (role: Role) =>
    role === "admin" ? tr.role_admin : role === "writer" ? tr.role_writer : role === "owner" ? tr.role_owner : tr.role_reader;

  const inputClass = "flex-1 px-3 py-2 bg-brand-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-brand-outline text-brand-text";
  const inputStyle = { border: "1px solid rgba(195,197,217,0.5)" };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-brand-text">{tr.users_title}</h1>
        <p className="text-sm text-brand-outline mt-1">{tr.users_subtitle}</p>
      </div>

      {/* Invite form */}
      <div className="bg-brand-surface rounded-2xl p-6 shadow-ambient-sm" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
        <h2 className="font-headline text-base font-semibold text-brand-text mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-primary" />
          {tr.users_invite}
        </h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
              placeholder={tr.field_first_name}
              className={inputClass}
              style={inputStyle}
            />
            <input
              type="text"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
              placeholder={tr.field_last_name}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={tr.users_invite_email}
              className={inputClass}
              style={inputStyle}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="px-3 py-2 bg-brand-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-text-secondary"
              style={inputStyle}
            >
              <option value="writer">{tr.role_writer}</option>
              <option value="reader">{tr.role_reader}</option>
              <option value="admin">{tr.role_admin}</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="btn-primary disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? tr.users_invite_sending : tr.users_invite_btn}
            </button>
          </div>
        </form>
        {inviteMsg && (
          <p className={`mt-3 text-sm ${inviteMsg.type === "success" ? "text-green-600" : "text-brand-error"}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Members list */}
      <div className="bg-brand-surface rounded-2xl overflow-hidden shadow-ambient-sm" style={{ border: "1px solid rgba(195,197,217,0.35)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-brand-outline uppercase tracking-wide" style={{ borderBottom: "1px solid rgba(195,197,217,0.35)" }}>
              <th className="text-left px-6 py-3">{tr.users_col_email}</th>
              <th className="text-left px-6 py-3">{tr.users_col_role}</th>
              <th className="text-left px-6 py-3">{tr.users_col_joined}</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-brand-outline text-sm">
                  {tr.users_no_members}
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.userId} className="last:border-0 hover:bg-brand-surface-low transition-colors" style={{ borderBottom: "1px solid rgba(195,197,217,0.25)" }}>
                  <td className="px-6 py-4">
                    {(m.firstName || m.lastName) && (
                      <p className="text-brand-text font-semibold text-sm">{`${m.firstName} ${m.lastName}`.trim()}</p>
                    )}
                    <p className="text-brand-outline text-xs">{m.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {m.userId === ownerId || m.role === "owner" ? (
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold">
                        {tr.role_owner}
                      </span>
                    ) : m.userId === currentUserId ? (
                      <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(0,62,199,0.08)", color: "#003ec7" }}>
                        {roleLabel(m.role)}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                        className="px-2 py-1 rounded-lg text-xs bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-text-secondary"
                        style={{ border: "1px solid rgba(195,197,217,0.5)" }}
                      >
                        <option value="owner">{tr.role_owner}</option>
                        <option value="admin">{tr.role_admin}</option>
                        <option value="writer">{tr.role_writer}</option>
                        <option value="reader">{tr.role_reader}</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-brand-outline text-xs">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {m.userId !== currentUserId && m.userId !== ownerId && m.role !== "owner" && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResend(m.userId, m.email)}
                          disabled={resendingId === m.userId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-primary hover:bg-brand-surface-low transition-colors disabled:opacity-50"
                        >
                          {resendMsg === m.userId ? tr.users_resend_success : resendingId === m.userId ? tr.users_resend_sending : tr.users_resend}
                        </button>
                        <button
                          onClick={() => handleRemove(m.userId)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            removingId === m.userId
                              ? "bg-brand-error text-white"
                              : "text-brand-error hover:bg-brand-error-container"
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          {removingId === m.userId ? tr.delete_confirm : tr.users_remove}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
