export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import QRLandingClient from "./QRLandingClient";
import CardUnavailable from "./CardUnavailable";

// Use service-role client so RLS never blocks reading lead_capture_enabled
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function parseDevice(ua: string): { device_type: string; os: string } {
  const u = ua.toLowerCase();
  let os = "Unknown";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ipod")) os = "iOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("windows")) os = "Windows";
  else if (u.includes("mac os") || u.includes("macintosh")) os = "macOS";
  else if (u.includes("linux")) os = "Linux";
  let device_type = "Desktop";
  if (u.includes("iphone") || u.includes("ipod") || (u.includes("android") && !u.includes("tablet"))) device_type = "Mobile";
  else if (u.includes("ipad") || u.includes("tablet")) device_type = "Tablet";
  return { device_type, os };
}

function normalizeRedirectUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default async function QRLandingPage({ params }: { params: { id: string } }) {
  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!row || !row.is_active) return <CardUnavailable />;

  // Direct-redirect mode: log the scan server-side, then 302 to the target.
  // We don't have access to localStorage here so visitor_id stays null — that
  // means returning-visitor stats are best-effort in this mode, but the scan
  // itself is fully tracked in qr_scans.
  const redirectTarget = normalizeRedirectUrl((row.direct_redirect_url as string) ?? "");
  if (redirectTarget) {
    const h = headers();
    const ua = h.get("user-agent") ?? "";
    const { device_type, os } = parseDevice(ua);
    const countryCode = h.get("x-vercel-ip-country");
    let country: string | null = null;
    if (countryCode) {
      try { country = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode; }
      catch { country = countryCode; }
    }
    const cityRaw = h.get("x-vercel-ip-city");
    const city = cityRaw ? decodeURIComponent(cityRaw) : null;
    const referrer = h.get("referer");
    await supabase.from("qr_scans").insert({
      contact_id: row.id,
      device_type,
      os,
      country,
      city,
      referrer,
      visitor_id: null,
      is_returning: false,
    });
    redirect(redirectTarget);
  }

  // Owner-level lead-capture kill switch overrides the per-card flag.
  const ownerId = (row.user_id as string) ?? "";
  const { data: ownerProfile } = ownerId
    ? await supabase.from("profiles").select("lead_capture_disabled").eq("user_id", ownerId).single()
    : { data: null };
  const orgLeadCaptureDisabled = !!ownerProfile?.lead_capture_disabled;

  // Platform-wide support email — single source of truth, set by platform owner
  const { data: platform } = await supabase
    .from("profiles")
    .select("support_email")
    .eq("is_platform_admin", true)
    .limit(1)
    .maybeSingle();
  const supportEmail = (platform?.support_email as string) || null;

  // Map DB row → app contact shape (same as toContact in store.ts)
  const contact = {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? "",
    qrLabel: (row.qr_label as string) ?? "",
    firstName: (() => { const n = (row.name as string) ?? ""; const i = n.lastIndexOf(" "); return i === -1 ? n : n.slice(0, i); })(),
    lastName: (() => { const n = (row.name as string) ?? ""; const i = n.lastIndexOf(" "); return i === -1 ? "" : n.slice(i + 1); })(),
    title: (row.title as string) ?? "",
    company: (row.company as string) ?? "",
    description: (row.description as string) ?? "",
    logoUrl: (row.logo_url as string) ?? "",
    phone: (() => { const p = (row.phone as string) ?? ""; try { const a = JSON.parse(p); if (!Array.isArray(a)) return p; const f = a[0]; return typeof f === "string" ? f : (f?.number ?? ""); } catch { return p; } })(),
    phones: (() => { const p = (row.phone as string) ?? ""; try { const a = JSON.parse(p); if (!Array.isArray(a)) return p ? [{ number: p, label: "" }] : []; return a.map((x: unknown) => typeof x === "string" ? { number: x, label: "" } : (x as { number: string; label: string })); } catch { return p ? [{ number: p, label: "" }] : []; } })(),
    emails: (() => { const e = (row.email as string) ?? ""; try { const a = JSON.parse(e); if (!Array.isArray(a)) return e ? [{ email: e, label: "" }] : []; return a.map((x: unknown) => typeof x === "string" ? { email: x, label: "" } : (x as { email: string; label: string })); } catch { return e ? [{ email: e, label: "" }] : []; } })(),
    websites: (() => { const w = (row.website as string) ?? ""; try { const a = JSON.parse(w); if (!Array.isArray(a)) return w ? [{ url: w, label: "" }] : []; return a.map((x: unknown) => typeof x === "string" ? { url: x, label: "" } : (x as { url: string; label: string })); } catch { return w ? [{ url: w, label: "" }] : []; } })(),
    email: (row.email as string) ?? "",
    website: (row.website as string) ?? "",
    linkedinUrl: (row.linkedin_url as string) ?? "",
    instagramUrl: (row.instagram_url as string) ?? "",
    facebookUrl: (row.facebook_url as string) ?? "",
    tiktokUrl: (row.tiktok_url as string) ?? "",
    snapchatUrl: (row.snapchat_url as string) ?? "",
    xUrl: (row.x_url as string) ?? "",
    otherSocialUrl: (row.other_social_url as string) ?? "",
    links: (() => {
      if (row.links && Array.isArray(row.links)) return row.links;
      if (row.pdf_url) return [{ url: row.pdf_url as string, label: (row.pdf_label as string) || "Dokument öffnen", type: "link" as const }];
      return [];
    })(),
    country: (row.country as string) ?? "",
    street: (row.street as string) ?? "",
    streetNr: (row.street_nr as string) ?? "",
    plz: (row.plz as string) ?? "",
    city: (row.city as string) ?? "",
    primaryColor: (row.primary_color as string) ?? "#2563eb",
    bgImageUrl: (row.bg_image_url as string) ?? "",
    notes: (row.notes as string) ?? "",
    showLogoInQr: (row.show_logo_in_qr as boolean) ?? true,
    isActive: (row.is_active as boolean) ?? true,
    leadCaptureEnabled: (row.lead_capture_enabled as boolean) ?? false,
    theme: ((row.theme as string) ?? "classic") as "classic" | "dark" | "minimal",
    qrDotStyle: ((row.qr_dot_style as string) ?? "square") as "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded",
    qrCornerStyle: ((row.qr_corner_style as string) ?? "square") as "square" | "dot" | "extra-rounded",
    qrDotColor: (row.qr_dot_color as string) ?? "#000000",
    qrBgColor: (row.qr_bg_color as string) ?? "#ffffff",
    qrGradient: (row.qr_gradient as boolean) ?? false,
    qrGradientColor: (row.qr_gradient_color as string) ?? "#2563eb",
    directRedirectUrl: "",
  };

  // Middleware sets `x-custom-domain` only when the request hits a true custom
  // domain. Trust that signal here — recomputing from the host header was
  // unreliable behind Vercel's proxy and incorrectly hid the "Powered by" line
  // on the main qr-card.ch domain.
  const isCustomDomain = !!headers().get("x-custom-domain");

  const leadCaptureActive = contact.leadCaptureEnabled && !orgLeadCaptureDisabled;
  return <QRLandingClient contact={contact} leadCaptureActive={leadCaptureActive} supportEmail={supportEmail} isCustomDomain={isCustomDomain} />;
}
