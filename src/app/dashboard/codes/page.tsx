"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink, Copy, Check, Download } from "lucide-react";
import { getAllContacts, deleteContact, getUserProfile } from "@/lib/store";
import { QRContact, Plan, PLAN_LIMITS } from "@/lib/types";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";


export default function CodesPage() {
  const { tr } = useLang();
  const { isAdmin, isReader } = useRole();
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    Promise.all([getAllContacts(), getUserProfile()]).then(([data, profile]) => {
      setContacts(data);
      if (profile) {
        setPlan(profile.plan);
        setIsOwner(profile.userId === profile.ownerId);
      }
    }).finally(() => setLoading(false));
  }, []);

  function getQRUrl(id: string) {
    return `${window.location.origin}/qr/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(getQRUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    await deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeleteModal(null);
  }

  function handleDownloadQR(id: string, logoUrl?: string, showLogoInQr?: boolean) {
    if (!showLogoInQr) logoUrl = undefined;
    const svgEl = document.querySelector(`#qr-${id} svg`) as SVGElement;
    if (!svgEl) return;
    const exportSize = 400;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(exportSize));
    clone.setAttribute("height", String(exportSize));
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d")!;
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, exportSize, exportSize);
      URL.revokeObjectURL(svgUrl);
      const finish = () => {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `qr-${id}.png`;
        a.click();
      };
      if (logoUrl) {
        const logoSize = Math.round(exportSize * 0.22);
        const padding = Math.round(logoSize * 0.1);
        const offset = (exportSize - logoSize) / 2;
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const scale = Math.min(logoSize / logoImg.naturalWidth, logoSize / logoImg.naturalHeight);
          const drawW = logoImg.naturalWidth * scale;
          const drawH = logoImg.naturalHeight * scale;
          const drawX = offset + (logoSize - drawW) / 2;
          const drawY = offset + (logoSize - drawH) / 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(offset - padding, offset - padding, logoSize + padding * 2, logoSize + padding * 2);
          ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
          finish();
        };
        logoImg.onerror = finish;
        logoImg.src = logoUrl;
      } else {
        finish();
      }
    };
    qrImg.src = svgUrl;
  }

  const limit = PLAN_LIMITS[plan];
  const limitReached = limit !== -1 && contacts.length >= limit;

  const filtered = contacts.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 wide:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-gray-500 mt-1">{contacts.length} {tr.codes_total}</p>
        </div>
        {!isReader && (
          limitReached ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-amber-800">{tr.plan_limit_reached} — </span>
              {isOwner ? (
                <Link href="/dashboard/upgrade" className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
                  {tr.free_plan_upgrade}
                </Link>
              ) : (
                <span className="text-sm text-amber-700">
                  {tr.plan_limit_ask_owner}{" "}
                  <Link href="/dashboard/upgrade" className="font-medium underline hover:text-amber-900 transition-colors">{tr.see_plans}</Link>.
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/dashboard/create"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              {tr.create_qr}
            </Link>
          )
        )}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={tr.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">{tr.no_results}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 wide:grid-cols-3 gap-5">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  {contact.qrLabel && (
                    <h3 className="font-semibold text-gray-900">{contact.qrLabel}</h3>
                  )}
                  <p className={contact.qrLabel ? "text-sm text-gray-700" : "font-semibold text-gray-900"}>
                    {`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}
                  </p>
                  {contact.company && (
                    <p className="text-sm text-gray-500">{contact.company}</p>
                  )}
                </div>
                {contact.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contact.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-lg" />
                )}
              </div>

              <div id={`qr-${contact.id}`} className="flex justify-center py-2 mt-auto">
                <QRCodeDisplay value={getQRUrl(contact.id)} size={140} logoUrl={contact.showLogoInQr ? contact.logoUrl : undefined} />
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400 font-mono">
                  {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>

              {contact.createdBy && (
                <p className="text-xs text-gray-400 -mt-2">
                  {tr.created_by}: {contact.createdBy}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {!isReader && (
                  <Link
                    href={`/dashboard/edit/${contact.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {tr.edit}
                  </Link>
                )}
                <button
                  onClick={() => handleCopy(contact.id)}
                  className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {copiedId === contact.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`/qr/${contact.id}`}
                  target="_blank"
                  className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDownloadQR(contact.id, contact.logoUrl, contact.showLogoInQr)}
                  className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteModal(contact.id)}
                    className="p-2 rounded-xl transition-colors border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{tr.delete_modal_title}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              {tr.delete_modal_body}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                {tr.delete_modal_cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                {tr.delete_modal_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
