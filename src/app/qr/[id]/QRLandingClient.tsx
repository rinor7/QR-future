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
  MapPin,
} from "lucide-react";
import { useState } from "react";

export default function QRLandingClient({ contact }: { contact: QRContact }) {
  const [shared, setShared] = useState(false);
  const color = contact.primaryColor || "#2563eb";

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `${contact.firstName} ${contact.lastName}`.trim() || "Kontakt", url: window.location.href });
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
      `FN:${`${contact.firstName} ${contact.lastName}`.trim()}`,
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
    a.download = `${`${contact.firstName} ${contact.lastName}`.trim() || "kontakt"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f1f5f9" }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header with gradient */}
        <div className="relative h-28" style={{ backgroundColor: color }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)"
          }} />
          {/* Avatar */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            {contact.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contact.logoUrl}
                alt={contact.company || "Logo"}
                className="w-20 h-20 rounded-2xl object-contain bg-white shadow-lg border-4 border-white"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = img.parentElement?.querySelector(".logo-fallback") as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="logo-fallback w-20 h-20 rounded-2xl items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white"
              style={{ backgroundColor: color, display: contact.logoUrl ? "none" : "flex" }}
            >
              {(`${contact.firstName} ${contact.lastName}`.trim() || contact.company || "?")[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="pt-14 pb-5 px-6 text-center">
          {(contact.firstName || contact.lastName) && (
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{`${contact.firstName} ${contact.lastName}`.trim()}</h1>
          )}
          {contact.title && (
            <p className="text-sm text-gray-500 mt-0.5">{contact.title}</p>
          )}
          {contact.company && (
            <p className="text-sm font-semibold mt-0.5" style={{ color }}>{contact.company}</p>
          )}
          {contact.address && (
            <p className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
              <MapPin className="w-3 h-3" />{contact.address}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-gray-100 mb-4" />

        {/* Action buttons */}
        <div className="px-5 space-y-2.5 pb-4">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-normal">Anrufen</div>
                <div className="text-sm font-semibold" style={{ color }}>{contact.phone}</div>
              </div>
            </a>
          )}

          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-normal">E-Mail</div>
                <div className="text-sm font-semibold truncate" style={{ color }}>{contact.email}</div>
              </div>
            </a>
          )}

          {contact.website && (
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-normal">Webseite</div>
                <div className="text-sm font-semibold truncate" style={{ color }}>{contact.website.replace(/^https?:\/\//, "")}</div>
              </div>
            </a>
          )}

          {contact.links && contact.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: color }}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400 font-normal">{link.type === "file" ? "Dokument" : "Link"}</div>
                <div className="text-sm font-semibold" style={{ color }}>{link.label}</div>
              </div>
              {link.type === "file" && (
                <div className="flex items-center gap-0.5 text-gray-400 shrink-0">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">PDF</span>
                </div>
              )}
            </a>
          ))}
        </div>

        {/* vCard + Share */}
        <div className="px-5 pb-4 flex gap-2.5">
          <button
            onClick={handleVCard}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: color, color }}
          >
            <Download className="w-4 h-4" />
            vCard
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: color, color }}
          >
            <Share2 className="w-4 h-4" />
            {shared ? "Kopiert!" : "Teilen"}
          </button>
        </div>

        {/* Social media icons */}
        {(contact.linkedinUrl || contact.instagramUrl || contact.facebookUrl) && (
          <div className="px-5 pb-6 flex items-center justify-center gap-3">
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: `${color}15`, color }}
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {contact.instagramUrl && (
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: `${color}15`, color }}
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {contact.facebookUrl && (
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: `${color}15`, color }}
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
