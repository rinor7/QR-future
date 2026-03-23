"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getContact, updateContact } from "@/lib/store";
import { QRContact, CreateQRContact } from "@/lib/types";
import QRForm from "@/components/QRForm";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { ExternalLink, Copy, Check, Download } from "lucide-react";
import { useLang } from "@/lib/language";
import { useRole } from "@/lib/useRole";

export default function EditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tr } = useLang();
  const { isReader, loading: roleLoading } = useRole();
  const id = params.id as string;

  const [contact, setContact] = useState<QRContact | null>(null);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justCreated = searchParams.get("created") === "1";

  useEffect(() => {
    if (!roleLoading && isReader) router.replace("/dashboard/codes");
  }, [isReader, roleLoading, router]);

  useEffect(() => {
    getContact(id).then((c) => {
      if (!c) {
        router.push("/dashboard");
        return;
      }
      setContact(c);
      setPreviewLogoUrl(c.showLogoInQr !== false ? c.logoUrl : undefined);
      setLoading(false);
    });
  }, [id, router]);

  function getQRUrl() {
    return `${window.location.origin}/qr/${id}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getQRUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQR() {
    const svgEl = document.querySelector("#qr-preview svg") as SVGElement;
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
      const logoUrl = previewLogoUrl;
      if (logoUrl) {
        const logoSize = Math.round(exportSize * 0.32);
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

  async function handleSubmit(data: CreateQRContact) {
    try {
      const updated = await updateContact(id, data);
      if (updated) setContact(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(tr.save_error);
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="p-4 wide:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.edit_title}</h1>
        <p className="text-gray-500 mt-1">{`${contact.firstName} ${contact.lastName}`.trim() || tr.unnamed}</p>
      </div>

      {justCreated && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
          {tr.edit_success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-8">
        <div className="flex-1">
          <QRForm
            initial={contact}
            onSubmit={handleSubmit}
            submitLabel={tr.save}
            saved={saved}
            onFormChange={(f) => setPreviewLogoUrl(f.showLogoInQr !== false ? f.logoUrl || undefined : undefined)}
          />
        </div>

        {/* QR Preview */}
        <div className="w-72 shrink-0">
          <div className="sticky top-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                QR Code
              </h3>
              <div id="qr-preview" className="flex justify-center mb-4">
                <QRCodeDisplay value={getQRUrl()} size={180} logoUrl={previewLogoUrl} />
              </div>
              <p className="text-xs text-gray-400 font-mono break-all mb-4">/qr/{id}</p>
              <div className="space-y-2">
                <a
                  href={`/qr/${id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {tr.open_page}
                </a>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? tr.copied : tr.copy_link}
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {tr.download_qr}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
