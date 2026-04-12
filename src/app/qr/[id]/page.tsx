export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
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
    .single();

  if (!row) notFound();
  if (!row.is_active) redirect("https://qr-card.ch");

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
    phone: (row.phone as string) ?? "",
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

  // Check if org has globally disabled lead capture
  let leadCaptureActive = contact.leadCaptureEnabled;
  if (leadCaptureActive && row.user_id) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("lead_capture_disabled")
        .eq("user_id", row.user_id)
        .single();
      if (profile?.lead_capture_disabled === true) leadCaptureActive = false;
    } catch {
      // If column doesn't exist or query fails, keep lead capture active
    }
  }

  return <QRLandingClient contact={contact} leadCaptureActive={leadCaptureActive} />;
}
