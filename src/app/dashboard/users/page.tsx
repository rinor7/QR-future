"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";
import { getTeamMembers, updateTeamMemberRole, removeTeamMember, getUserProfile } from "@/lib/store";
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
  const [inviteRole, setInviteRole] = useState<Role>("writer");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;
    getUserProfile().then((p) => {
      if (!p?.canManageUsers) {
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
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, ownerId: profile?.ownerId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        setInviteMsg({ type: "error", text: error || tr.users_invite_error });
      } else {
        setInviteMsg({ type: "success", text: tr.users_invite_success });
        setInviteEmail("");
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
      await removeTeamMember(memberId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
      setRemovingId(null);
    } else {
      setRemovingId(memberId);
      setTimeout(() => setRemovingId(null), 3000);
    }
  }

  const roleLabel = (role: Role) =>
    role === "admin" ? tr.role_admin : role === "writer" ? tr.role_writer : tr.role_reader;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tr.users_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.users_subtitle}</p>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          {tr.users_invite}
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={tr.users_invite_email}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="writer">{tr.role_writer}</option>
            <option value="reader">{tr.role_reader}</option>
            <option value="admin">{tr.role_admin}</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {inviting ? tr.users_invite_sending : tr.users_invite_btn}
          </button>
        </form>
        {inviteMsg && (
          <p className={`mt-3 text-sm ${inviteMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-6 py-3">{tr.users_col_email}</th>
              <th className="text-left px-6 py-3">{tr.users_col_role}</th>
              <th className="text-left px-6 py-3">{tr.users_col_joined}</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                  {tr.users_no_members}
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-gray-800 font-medium">{m.email}</td>
                  <td className="px-6 py-4">
                    {m.userId === ownerId ? (
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold">
                        Owner
                      </span>
                    ) : m.userId === currentUserId ? (
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                        {roleLabel(m.role)}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">{tr.role_admin}</option>
                        <option value="writer">{tr.role_writer}</option>
                        <option value="reader">{tr.role_reader}</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {m.userId !== currentUserId && m.userId !== ownerId && (
                      <button
                        onClick={() => handleRemove(m.userId)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          removingId === m.userId
                            ? "bg-red-600 text-white"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                        {removingId === m.userId ? tr.delete_confirm : tr.users_remove}
                      </button>
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
