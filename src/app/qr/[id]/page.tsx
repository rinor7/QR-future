export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import QRLandingClient from "./QRLandingClient";

// Use service-role client so RLS never blocks reading lead_capture_enabled
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function QRLandingPage({ params }: { params: { id: string } }) {
  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!row) notFound();
  if (!row.is_active) redirect("https://qr-card.ch");

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
  };

  // Middleware sets `x-custom-domain` only when the request hits a true custom
  // domain. Trust that signal here — recomputing from the host header was
  // unreliable behind Vercel's proxy and incorrectly hid the "Powered by" line
  // on the main qr-card.ch domain.
  const isCustomDomain = !!headers().get("x-custom-domain");

  return <QRLandingClient contact={contact} leadCaptureActive={contact.leadCaptureEnabled} supportEmail={supportEmail} isCustomDomain={isCustomDomain} />;
}
