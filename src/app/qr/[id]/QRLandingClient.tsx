"use client";

import { QRContact } from "@/lib/types";
import {
  Phone,
  Globe,
  Ghost,
  Music2,
  Link2,
  FileText,
  Share2,
  Download,
  Mail,
  MapPin,
} from "lucide-react";

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
import { useState, useEffect } from "react";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Switzerland +41 + 9 digits → +41 XX XXX XX XX
  if (phone.startsWith("+41") && digits.length === 11) {
    return `+41 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  // Kosovo +383 + 8 digits → +383 XX XXX XXX
  if (phone.startsWith("+383") && digits.length === 11) {
    return `+383 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  }
  // Generic: keep + and country code, space-group remaining digits as XX XXX XXX...
  if (phone.startsWith("+") && digits.length >= 8) {
    const sub = digits.slice(digits.length >= 11 ? 3 : 2);
    const groups = sub.match(/.{1,3}/g) ?? [];
    return `+${digits.slice(0, digits.length - sub.length)} ${groups.join(" ")}`;
  }
  return phone;
}

const THEMES = {
  classic: {
    page: "bg-[#f1f5f9]",
    card: "bg-white",
    text: "text-gray-900",
    subtext: "text-gray-500",
    divider: "border-gray-100",
    btnBg: (color: string) => `${color}15`,
    btnText: (color: string) => color,
    iconBg: (color: string) => color,
    iconText: "#fff",
    socialBg: (color: string) => `${color}15`,
    socialText: (color: string) => color,
    borderColor: (color: string) => color,
    actionLabelColor: "text-gray-400",
  },
  dark: {
    page: "bg-gray-950",
    card: "bg-gray-900",
    text: "text-white",
    subtext: "text-gray-400",
    divider: "border-gray-700",
    btnBg: () => "rgba(255,255,255,0.08)",
    btnText: () => "#fff",
    iconBg: (color: string) => color,
    iconText: "#fff",
    socialBg: () => "rgba(255,255,255,0.1)",
    socialText: () => "#fff",
    borderColor: () => "rgba(255,255,255,0.3)",
    actionLabelColor: "text-gray-500",
  },
  minimal: {
    page: "bg-white",
    card: "bg-white shadow-none border border-gray-200",
    text: "text-gray-900",
    subtext: "text-gray-500",
    divider: "border-gray-100",
    btnBg: () => "#f9fafb",
    btnText: () => "#374151",
    iconBg: () => "#e5e7eb",
    iconText: "#374151",
    socialBg: () => "#f3f4f6",
    socialText: () => "#374151",
    borderColor: () => "#d1d5db",
    actionLabelColor: "text-gray-400",
  },
} as const;

export default function QRLandingClient({ contact }: { contact: QRContact }) {
  const [shared, setShared] = useState(false);
  const color = contact.primaryColor || "#2563eb";
  const th = THEMES[contact.theme ?? "classic"];

  useEffect(() => {
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id }),
    }).catch(() => {});
  }, [contact.id]);

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
      (contact.street || contact.city) ? `ADR:;;${contact.street} ${contact.streetNr};${contact.city};;${contact.plz};Switzerland` : "",
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
    <div className={`min-h-screen flex items-center justify-center p-4 ${th.page}`}>
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${th.card}`}>

        {/* Header with gradient or bg image */}
        <div
          className="relative h-28"
          style={contact.bgImageUrl
            ? { backgroundImage: `url(${contact.bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: color }
          }
        >
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: contact.bgImageUrl
              ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)"
              : "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)"
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
            <h1 className={`text-xl font-bold leading-tight ${th.text}`}>{`${contact.firstName} ${contact.lastName}`.trim()}</h1>
          )}
          {contact.title && (
            <p className={`text-sm mt-0.5 ${th.subtext}`}>{contact.title}</p>
          )}
          {contact.company && (
            <p className="text-sm font-semibold mt-0.5" style={{ color }}>{contact.company}</p>
          )}
          {(contact.street || contact.city) && (
            <p className={`flex items-center justify-center gap-1 text-xs mt-2 ${th.subtext}`}>
              <MapPin className="w-3 h-3" />
              {[`${contact.street} ${contact.streetNr}`.trim(), contact.plz, contact.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className={`mx-6 border-t mb-4 ${th.divider}`} />

        {/* Action buttons */}
        <div className="px-5 space-y-2.5 pb-4">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: th.btnBg(color), color: th.btnText(color) }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: th.iconBg(color), color: th.iconText }}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-normal ${th.actionLabelColor}`}>Anrufen</div>
                <div className="text-sm font-semibold">{formatPhone(contact.phone)}</div>
              </div>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: th.btnBg(color), color: th.btnText(color) }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: th.iconBg(color), color: th.iconText }}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-normal ${th.actionLabelColor}`}>E-Mail</div>
                <div className="text-sm font-semibold truncate">{contact.email}</div>
              </div>
            </a>
          )}
          {contact.website && (
            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: th.btnBg(color), color: th.btnText(color) }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: th.iconBg(color), color: th.iconText }}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-normal ${th.actionLabelColor}`}>Webseite</div>
                <div className="text-sm font-semibold truncate">{contact.website.replace(/^https?:\/\//, "")}</div>
              </div>
            </a>
          )}
          {contact.links && contact.links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: th.btnBg(color), color: th.btnText(color) }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: th.iconBg(color), color: th.iconText }}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-normal ${th.actionLabelColor}`}>{link.type === "file" ? "Dokument" : "Link"}</div>
                <div className="text-sm font-semibold">{link.label}</div>
              </div>
              {link.type === "file" && (
                <div className={`flex items-center gap-0.5 shrink-0 ${th.subtext}`}>
                  <Download className="w-3 h-3" />
                  <span className="text-xs">PDF</span>
                </div>
              )}
            </a>
          ))}
        </div>

        {/* vCard + Share */}
        <div className="px-5 pb-4 flex gap-2.5">
          <button onClick={handleVCard} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-2 transition-colors" style={{ borderColor: th.borderColor(color), color: th.btnText(color) }}>
            <Download className="w-4 h-4" />
            vCard
          </button>
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-2 transition-colors" style={{ borderColor: th.borderColor(color), color: th.btnText(color) }}>
            <Share2 className="w-4 h-4" />
            {shared ? "Kopiert!" : "Teilen"}
          </button>
        </div>

        {/* Social media icons */}
        {(contact.linkedinUrl || contact.instagramUrl || contact.facebookUrl || contact.tiktokUrl || contact.snapchatUrl || contact.xUrl || contact.otherSocialUrl) && (
          <div className="px-5 pb-6 flex items-center justify-center flex-wrap gap-3">
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="LinkedIn">
                <LinkedInIcon className="w-4 h-4" />
              </a>
            )}
            {contact.instagramUrl && (
              <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="Instagram">
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}
            {contact.facebookUrl && (
              <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="Facebook">
                <FacebookIcon className="w-4 h-4" />
              </a>
            )}
            {contact.tiktokUrl && (
              <a href={contact.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="TikTok">
                <Music2 className="w-4 h-4" />
              </a>
            )}
            {contact.snapchatUrl && (
              <a href={contact.snapchatUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="Snapchat">
                <Ghost className="w-4 h-4" />
              </a>
            )}
            {contact.xUrl && (
              <a href={contact.xUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="X">
                <XBrandIcon className="w-4 h-4" />
              </a>
            )}
            {contact.otherSocialUrl && (
              <a href={contact.otherSocialUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: th.socialBg(color), color: th.socialText(color) }} title="Link">
                <Link2 className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
