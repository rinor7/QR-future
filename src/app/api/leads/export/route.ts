import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const EVENT_LABELS: Record<string, string> = {
  click_phone: "Phone Call",
  click_email: "Email",
  click_website: "Website",
  click_pdf: "PDF Opened",
  click_link: "Link",
  click_save_contact: "Saved Contact",
  click_share: "Shared",
  click_social_linkedin: "LinkedIn",
  click_social_instagram: "Instagram",
  click_social_facebook: "Facebook",
  click_social_tiktok: "TikTok",
  click_social_snapchat: "Snapchat",
  click_social_x: "X (Twitter)",
  click_social_other: "Other Social",
  lead_capture_open: "Lead Form Opened",
  lead_capture_submit: "Lead Submitted",
};

const HIGH_INTENT = new Set(["click_phone", "click_email", "click_save_contact"]);

function leadScore(scanCount: number, events: string[]): number {
  return scanCount + events.reduce((sum, ev) => sum + (HIGH_INTENT.has(ev) ? 5 : 2), 0);
}

function esc(val: string | number | null | undefined): string {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const contactIdFilter = req.nextUrl.searchParams.get("contact_id");

  const { data: contacts } = await supabase
    .from("contacts").select("id, name, qr_label").eq("user_id", ownerId);

  const contactMap: Record<string, { name: string; qrLabel: string }> = {};
  (contacts ?? []).forEach((c) => {
    contactMap[c.id] = { name: c.name || "—", qrLabel: c.qr_label || c.id.slice(0, 8) };
  });

  const contactIds = Object.keys(contactMap);
  const emptyHeaders = "Name,Email,Comment,Hot Lead,Lead Score,Scan Count,Device,OS,Country,Interactions,QR Code,Employee,Consented At,Captured At\n";

  if (contactIds.length === 0) {
    return new NextResponse(emptyHeaders, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="leads-export.csv"` },
    });
  }

  let leadsQuery = supabase
    .from("qr_leads")
    .select("id, contact_id, visitor_id, name, email, comment, consented_at, created_at")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });
  if (contactIdFilter) leadsQuery = leadsQuery.eq("contact_id", contactIdFilter);

  const { data: leads } = await leadsQuery;

  if (!leads || leads.length === 0) {
    return new NextResponse(emptyHeaders, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="leads-export.csv"` },
    });
  }

  // Visitor IDs from leads
  const visitorIds = leads.map((l) => l.visitor_id).filter(Boolean) as string[];

  // Scan data per visitor
  const visitorScanMap: Record<string, { scanCount: number; device: string; os: string; country: string }> = {};
  if (visitorIds.length > 0) {
    const { data: scans } = await supabase
      .from("qr_scans")
      .select("visitor_id, device_type, os, country")
      .in("visitor_id", visitorIds);

    (scans ?? []).forEach((s) => {
      if (!s.visitor_id) return;
      if (!visitorScanMap[s.visitor_id]) {
        visitorScanMap[s.visitor_id] = { scanCount: 0, device: s.device_type ?? "", os: s.os ?? "", country: s.country ?? "" };
      }
      visitorScanMap[s.visitor_id].scanCount++;
      if (!visitorScanMap[s.visitor_id].device && s.device_type) visitorScanMap[s.visitor_id].device = s.device_type;
      if (!visitorScanMap[s.visitor_id].country && s.country) visitorScanMap[s.visitor_id].country = s.country;
    });
  }

  // Interactions per visitor
  const visitorEventMap: Record<string, string[]> = {};
  if (visitorIds.length > 0) {
    const { data: interactions } = await supabase
      .from("qr_interactions")
      .select("visitor_id, event_type")
      .in("visitor_id", visitorIds);

    (interactions ?? []).forEach((ix) => {
      if (!ix.visitor_id) return;
      if (!visitorEventMap[ix.visitor_id]) visitorEventMap[ix.visitor_id] = [];
      if (!visitorEventMap[ix.visitor_id].includes(ix.event_type)) {
        visitorEventMap[ix.visitor_id].push(ix.event_type);
      }
    });
  }

  const headers = [
    "Name", "Email", "Comment",
    "Hot Lead", "Lead Score", "Scan Count",
    "Device", "OS", "Country", "Interactions",
    "QR Code", "Employee",
    "Consented At", "Captured At",
  ];

  const date = (v: string | null) => v ? new Date(v).toISOString().replace("T", " ").slice(0, 19) : "";

  const rows = leads.map((lead) => {
    const meta = contactMap[lead.contact_id] ?? { name: "—", qrLabel: lead.contact_id };
    const scan = visitorScanMap[lead.visitor_id] ?? { scanCount: 0, device: "", os: "", country: "" };
    const events = visitorEventMap[lead.visitor_id] ?? [];
    const isHot = events.some((e) => HIGH_INTENT.has(e)) || scan.scanCount >= 2;
    const score = leadScore(scan.scanCount || 1, events);
    const interactions = events.map((e) => EVENT_LABELS[e] ?? e).join("; ");

    return [
      esc(lead.name),
      esc(lead.email),
      esc(lead.comment),
      isHot ? "Yes" : "No",
      esc(score),
      esc(scan.scanCount || 1),
      esc(scan.device),
      esc(scan.os),
      esc(scan.country),
      esc(interactions),
      esc(meta.qrLabel),
      esc(meta.name),
      esc(date(lead.consented_at)),
      esc(date(lead.created_at)),
    ].join(",");
  });

  const csv = [headers.map(esc).join(","), ...rows].join("\n");
  const filename = contactIdFilter
    ? `leads-${contactMap[contactIdFilter]?.qrLabel ?? contactIdFilter}.csv`
    : "leads-all-export.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
