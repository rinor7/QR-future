"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getContact, updateContact } from "@/lib/store";
import { QRContact, CreateQRContact } from "@/lib/types";
import QRForm from "@/components/QRForm";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { ExternalLink, Copy, Check, Download } from "lucide-react";

export default function EditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<QRContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justCreated = searchParams.get("created") === "1";

  useEffect(() => {
    getContact(id).then((c) => {
      if (!c) {
        router.push("/dashboard");
        return;
      }
      setContact(c);
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
    const svg = document.querySelector("#qr-preview svg") as SVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(data: CreateQRContact) {
    try {
      await updateContact(id, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError("Fehler beim Speichern.");
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QR Code bearbeiten</h1>
        <p className="text-gray-500 mt-1">{contact.name || "Unbenannt"}</p>
      </div>

      {justCreated && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
          QR Code erfolgreich erstellt!
        </div>
      )}
      {saved && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm font-medium">
          Gespeichert!
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-8">
        <div className="flex-1">
          <QRForm initial={contact} onSubmit={handleSubmit} submitLabel="Speichern" />
        </div>

        {/* QR Preview */}
        <div className="w-72 shrink-0">
          <div className="sticky top-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                QR Code
              </h3>
              <div id="qr-preview" className="flex justify-center mb-4">
                <QRCodeDisplay value={getQRUrl()} size={180} />
              </div>
              <p className="text-xs text-gray-400 font-mono break-all mb-4">/qr/{id}</p>
              <div className="space-y-2">
                <a
                  href={`/qr/${id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Seite öffnen
                </a>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopiert!" : "Link kopieren"}
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  QR herunterladen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
