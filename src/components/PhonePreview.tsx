"use client";

import { CreateQRContact } from "@/lib/types";
import {
  Phone, Mail, Globe, MapPin, Linkedin, Instagram, Facebook,
} from "lucide-react";

export default function PhonePreview({ form, showLabel = true }: { form: Partial<CreateQRContact>; showLabel?: boolean }) {
  const color = form.primaryColor ?? "#2563eb";
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Your Name";
  const title = form.title || "";
  const company = form.company || "";
  const theme = form.theme ?? "classic";

  const cardBg = theme === "dark" ? "#111827" : theme === "minimal" ? "#f9fafb" : "#ffffff";
  const textColor = theme === "dark" ? "#f9fafb" : "#111827";
  const subtextColor = theme === "dark" ? "#9ca3af" : "#6b7280";
  const btnBg = theme === "dark" ? "rgba(255,255,255,0.08)" : theme === "minimal" ? "#f3f4f6" : `${color}18`;
  const btnText = theme === "dark" ? "#e5e7eb" : color;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px]">
        <div className="absolute inset-0 rounded-[36px] bg-gray-900 shadow-2xl" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
        <div className="relative mx-[6px] my-[10px] rounded-[30px] overflow-hidden bg-gray-100" style={{ minHeight: 420 }}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

          <div className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: cardBg }}>
            <div className="h-28 w-full relative flex-shrink-0" style={{ background: `linear-gradient(135deg, ${color}cc 0%, ${color} 100%)` }}>
              {form.bgImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.bgImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}
            </div>

            <div className="relative flex justify-center" style={{ marginTop: -28 }}>
              <div
                className="w-14 h-14 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color}99 0%, ${color} 100%)` }}
              >
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(form.firstName?.[0] ?? "?").toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="px-4 pt-2 pb-3 text-center">
              <p className="font-bold text-sm leading-tight" style={{ color: textColor }}>{name}</p>
              {title && <p className="text-xs mt-0.5" style={{ color: subtextColor }}>{title}</p>}
              {company && <p className="text-xs mt-0.5 font-medium" style={{ color }}>{company}</p>}
            </div>

            <div className="px-3 space-y-1.5 pb-3">
              {(() => {
                const phones = (form.phones ?? []).filter((p) => p.number);
                const emails = (form.emails ?? []).filter((e) => e.email);
                const websites = (form.websites ?? []).filter((w) => w.url);
                const hasAny = phones.length + emails.length + websites.length > 0;
                return hasAny ? (
                  <>
                    {phones.map((ph, i) => (
                      <div key={`p${i}`} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: btnBg }}>
                        <Phone className="w-3 h-3 shrink-0" style={{ color: btnText }} />
                        <span className="text-xs truncate" style={{ color: btnText }}>{ph.number}</span>
                      </div>
                    ))}
                    {emails.map((em, i) => (
                      <div key={`e${i}`} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: btnBg }}>
                        <Mail className="w-3 h-3 shrink-0" style={{ color: btnText }} />
                        <span className="text-xs truncate" style={{ color: btnText }}>{em.email}</span>
                      </div>
                    ))}
                    {websites.map((ws, i) => (
                      <div key={`w${i}`} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: btnBg }}>
                        <Globe className="w-3 h-3 shrink-0" style={{ color: btnText }} />
                        <span className="text-xs truncate" style={{ color: btnText }}>{ws.url.replace(/^https?:\/\//, "")}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="h-6 rounded-lg opacity-20" style={{ backgroundColor: color }} />
                    <div className="h-6 rounded-lg opacity-10" style={{ backgroundColor: color }} />
                    <div className="h-6 rounded-lg opacity-10" style={{ backgroundColor: color }} />
                  </>
                );
              })()}

              {(form.city || form.street) && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: btnBg }}>
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: btnText }} />
                  <span className="text-xs truncate" style={{ color: btnText }}>
                    {[form.street, form.streetNr, form.city].filter(Boolean).join(" ")}
                  </span>
                </div>
              )}

              {(form.linkedinUrl || form.instagramUrl || form.facebookUrl) && (
                <div className="flex gap-2 pt-1 justify-center">
                  {form.linkedinUrl && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: btnBg }}><Linkedin className="w-3 h-3" style={{ color: btnText }} /></div>}
                  {form.instagramUrl && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: btnBg }}><Instagram className="w-3 h-3" style={{ color: btnText }} /></div>}
                  {form.facebookUrl && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: btnBg }}><Facebook className="w-3 h-3" style={{ color: btnText }} /></div>}
                </div>
              )}

              {form.links && form.links.length > 0 && (
                <div className="pt-1 space-y-1">
                  {form.links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: btnBg }}>
                      <span className="material-symbols-outlined text-[13px] shrink-0" style={{ color: btnText }}>
                        {link.type === "file" ? "picture_as_pdf" : "link"}
                      </span>
                      <span className="text-xs truncate" style={{ color: btnText }}>{link.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/40 rounded-full" />
      </div>

      {showLabel && <p className="mt-4 text-xs text-slate-400 font-medium">Live Preview</p>}
    </div>
  );
}
