"use client";

import { QRContact } from "@/lib/types";
import {
  Phone,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  FileText,
  Share2,
  Download,
  Mail,
} from "lucide-react";
import { useState } from "react";

export default function QRLandingClient({ contact }: { contact: QRContact }) {
  const [shared, setShared] = useState(false);
  const color = contact.primaryColor || "#2563eb";

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: contact.name || "Kontakt", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  function handleVCard() {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${contact.name}`,
      contact.title ? `TITLE:${contact.title}` : "",
      contact.company ? `ORG:${contact.company}` : "",
      contact.phone ? `TEL;TYPE=CELL:${contact.phone}` : "",
      contact.email ? `EMAIL:${contact.email}` : "",
      contact.website ? `URL:${contact.website}` : "",
      contact.address ? `ADR:;;${contact.address};;;;` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contact.name || "kontakt"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Top color band */}
        <div className="h-3" style={{ backgroundColor: color }} />

        {/* Logo + Identity */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6">
          {contact.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.logoUrl}
              alt={contact.company || "Logo"}
              className="h-20 w-auto object-contain mb-4"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-4"
              style={{ backgroundColor: color }}
            >
              {(contact.name || contact.company || "?")[0].toUpperCase()}
            </div>
          )}

          {contact.name && (
            <h1 className="text-2xl font-bold text-center" style={{ color }}>
              {contact.name}
            </h1>
          )}
          {contact.title && (
            <p className="text-sm text-gray-500 text-center mt-1">{contact.title}</p>
          )}
          {contact.company && (
            <p className="text-base font-semibold text-center mt-0.5" style={{ color }}>
              {contact.company}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 space-y-3 pb-4">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Phone className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">Anrufen</span>
            </a>
          )}

          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Mail className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">E-Mail</span>
            </a>
          )}

          {contact.website && (
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Globe className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">Webseite</span>
            </a>
          )}

          {contact.linkedinUrl && (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Linkedin className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">Vernetzen</span>
            </a>
          )}

          {contact.instagramUrl && (
            <a
              href={contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Instagram className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">Instagram</span>
            </a>
          )}

          {contact.facebookUrl && (
            <a
              href={contact.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <Facebook className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">Facebook</span>
            </a>
          )}

          {contact.pdfUrl && (
            <a
              href={contact.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full text-white py-4 px-5 rounded-2xl font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-center uppercase tracking-widest">
                {contact.pdfLabel || "Dokument"}
              </span>
            </a>
          )}
        </div>

        {/* vCard + Share */}
        <div className="px-6 pb-8 flex gap-3">
          <button
            onClick={handleVCard}
            className="flex-1 flex items-center justify-center gap-2 border-2 py-3.5 rounded-2xl font-semibold text-sm tracking-wide hover:bg-gray-50 transition-colors"
            style={{ borderColor: color, color }}
          >
            <Download className="w-4 h-4" />
            vCard
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 border-2 py-3.5 rounded-2xl font-semibold text-sm tracking-wide hover:bg-gray-50 transition-colors"
            style={{ borderColor: color, color }}
          >
            <Share2 className="w-4 h-4" />
            {shared ? "Kopiert!" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
