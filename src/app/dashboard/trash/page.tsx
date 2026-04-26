"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile, getDeletedContacts, restoreContact, purgeContact } from "@/lib/store";
import { getDeletedFolders, restoreFolder, purgeFolderRpc, type Folder } from "@/lib/folders";
import { QRContact } from "@/lib/types";

const RETENTION_HOURS = 72;

function expiresIn(deletedAt: string): string {
  const deleted = new Date(deletedAt).getTime();
  const expires = deleted + RETENTION_HOURS * 60 * 60 * 1000;
  const remaining = expires - Date.now();
  if (remaining <= 0) return "expiring now";
  const h = Math.floor(remaining / (60 * 60 * 1000));
  if (h >= 1) return `${h}h left`;
  const m = Math.floor(remaining / (60 * 1000));
  return `${m}m left`;
}

export default function TrashPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [deletedQRs, setDeletedQRs] = useState<(QRContact & { deletedAt: string })[]>([]);
  const [deletedFolders, setDeletedFolders] = useState<(Folder & { deleted_at: string })[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [emptying, setEmptying] = useState(false);

  async function load() {
    const [qrs, profile] = await Promise.all([getDeletedContacts(), getUserProfile()]);
    if (!profile) { router.push("/login"); return; }
    if (profile.userId !== profile.ownerId) { setAllowed(false); setLoading(false); return; }
    const folders = await getDeletedFolders(profile.ownerId);
    setDeletedQRs(qrs);
    setDeletedFolders(folders as (Folder & { deleted_at: string })[]);
    setAllowed(true);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRestoreQR(id: string) {
    setBusyId(id);
    try {
      await restoreContact(id);
      setDeletedQRs((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurgeQR(id: string) {
    if (!confirm("Permanently delete this QR code? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await purgeContact(id);
      setDeletedQRs((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestoreFolder(id: string) {
    setBusyId(id);
    try {
      await restoreFolder(id);
      setDeletedFolders((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurgeFolder(id: string) {
    if (!confirm("Permanently delete this folder? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await purgeFolderRpc(id);
      setDeletedFolders((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEmptyTrash() {
    setEmptying(true);
    try {
      for (const c of deletedQRs) await purgeContact(c.id);
      for (const f of deletedFolders) {
        try { await purgeFolderRpc(f.id); } catch { /* may have child constraint; skip */ }
      }
      setDeletedQRs([]);
      setDeletedFolders([]);
      setEmptyConfirm(false);
    } finally {
      setEmptying(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!allowed) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center">
          <span className="material-symbols-outlined text-[40px] text-slate-300 mb-3">lock</span>
          <h2 className="text-lg font-bold mb-1">Owner only</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Only the account owner can view the trash.</p>
        </div>
      </div>
    );
  }

  const hasItems = deletedQRs.length > 0 || deletedFolders.length > 0;

  return (
    <div className="p-4 wide:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl wide:text-3xl font-headline font-bold text-slate-900 dark:text-slate-100">Trash</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deleted items are kept for {RETENTION_HOURS} hours, then permanently removed. Only you (the owner) can see this page.
          </p>
        </div>
        {hasItems && (
          <button
            onClick={() => setEmptyConfirm(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-red-600 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
            <span className="hidden sm:inline">Empty Trash</span>
          </button>
        )}
      </div>

      {!hasItems ? (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-300">delete_outline</span>
          <p className="text-sm font-semibold mt-3 text-slate-700 dark:text-slate-300">Trash is empty</p>
          <p className="text-xs text-slate-400 mt-1">Anything you delete will appear here for {RETENTION_HOURS} hours before it&apos;s gone for good.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders section */}
          {deletedFolders.length > 0 && (
            <section className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-500">folder</span>
                <h2 className="font-bold text-sm">Folders ({deletedFolders.length})</h2>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {deletedFolders.map((f) => (
                  <li key={f.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{f.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {f.deleted_at && (
                          <>Deleted {new Date(f.deleted_at).toLocaleString()} · <span className="text-amber-600 font-semibold">{expiresIn(f.deleted_at)}</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={busyId === f.id}
                        onClick={() => handleRestoreFolder(f.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">restore</span>
                        Restore
                      </button>
                      <button
                        disabled={busyId === f.id}
                        onClick={() => handlePurgeFolder(f.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                        Delete forever
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* QR codes section */}
          {deletedQRs.length > 0 && (
            <section className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-500">qr_code_2</span>
                <h2 className="font-bold text-sm">QR Codes ({deletedQRs.length})</h2>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {deletedQRs.map((c) => {
                  const deletedAt = c.deletedAt;
                  return (
                    <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {`${c.firstName} ${c.lastName}`.trim() || c.qrLabel || c.id}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.qrLabel && <span className="mr-2">{c.qrLabel}</span>}
                          Deleted {new Date(deletedAt).toLocaleString()} · <span className="text-amber-600 font-semibold">{expiresIn(deletedAt)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          disabled={busyId === c.id}
                          onClick={() => handleRestoreQR(c.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[14px]">restore</span>
                          Restore
                        </button>
                        <button
                          disabled={busyId === c.id}
                          onClick={() => handlePurgeQR(c.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                          Delete forever
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {emptyConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-[0px_20px_40px_rgba(25,28,30,0.18)] max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500">delete_forever</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">Empty Trash?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5">
              This permanently deletes <span className="font-bold">{deletedQRs.length}</span> QR code{deletedQRs.length === 1 ? "" : "s"} and <span className="font-bold">{deletedFolders.length}</span> folder{deletedFolders.length === 1 ? "" : "s"}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                disabled={emptying}
                onClick={() => setEmptyConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={emptying}
                onClick={handleEmptyTrash}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {emptying && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
