import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

function buildFolderPath(
  folderId: string | null,
  folderMap: Map<string, { name: string; parent_id: string | null }>
): string {
  if (!folderId) return "";
  const parts: string[] = [];
  let current: string | null = folderId;
  let safety = 0;
  while (current && safety < 10) {
    const node = folderMap.get(current);
    if (!node) break;
    parts.unshift(node.name);
    current = node.parent_id;
    safety++;
  }
  return parts.join(" > ");
}

function esc(val: string | number | null | undefined): string {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, company, qr_label, folder_id, lead_capture_enabled")
    .eq("id", params.id)
    .eq("user_id", ownerId)
    .single();
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: folders } = await supabase
    .from("folders").select("id, name, parent_id").eq("organization_id", ownerId);
  const folderMap = new Map<string, { name: string; parent_id: string | null }>();
  (folders ?? []).forEach((f) => folderMap.set(f.id, { name: f.name, parent_id: f.parent_id }));

  const label = contact.qr_label || contact.name || contact.id;
  const folderPath = buildFolderPath(contact.folder_id, folderMap);

  // Scans
  const { data: scans } = await supabase
    .from("qr_scans")
    .select("scanned_at, device_type, os, country, city, referrer, is_returning, visitor_id")
    .eq("contact_id", params.id)
    .order("scanned_at", { ascending: false });

  // Interactions per visitor
  const { data: interactions } = await supabase
    .from("qr_interactions")
    .select("visitor_id, event_type")
    .eq("contact_id", params.id);

  const interactionMap: Record<string, string[]> = {};
  (interactions ?? []).forEach((ix) => {
    if (!ix.visitor_id) return;
    if (!interactionMap[ix.visitor_id]) interactionMap[ix.visitor_id] = [];
    if (!interactionMap[ix.visitor_id].includes(ix.event_type)) {
      interactionMap[ix.visitor_id].push(ix.event_type);
    }
  });

  // Leads per visitor
  const { data: leads } = await supabase
    .from("qr_leads")
    .select("visitor_id, name, email")
    .eq("contact_id", params.id);

  const leadVisitors = new Set((leads ?? []).map((l) => l.visitor_id).filter(Boolean));

  // Hot lead visitor IDs (phone, email, save contact clicked)
  const HIGH_INTENT = new Set(["click_phone", "click_email", "click_save_contact"]);
  const hotLeadVisitors = new Set(
    (interactions ?? [])
      .filter((ix) => ix.visitor_id && HIGH_INTENT.has(ix.event_type))
      .map((ix) => ix.visitor_id)
  );

  const headers = [
    "QR Label", "Employee Name", "Company", "Folder",
    "Date", "Time (UTC)", "Timestamp",
    "Device", "OS", "Country", "City", "Referrer",
    "Returning Visitor", "Interactions", "Lead Captured", "Hot Lead",
    "Visitor ID",
  ];

  const rows = (scans ?? []).map((s) => {
    const dt = s.scanned_at ? new Date(s.scanned_at) : null;
    const date = dt ? dt.toISOString().slice(0, 10) : "";
    const time = dt ? dt.toISOString().slice(11, 19) + " UTC" : "";
    const timestamp = dt ? dt.toISOString() : "";

    const events = (interactionMap[s.visitor_id] ?? [])
      .map((e) => EVENT_LABELS[e] ?? e)
      .join("; ");

    return [
      esc(label),
      esc(contact.name),
      esc(contact.company),
      esc(folderPath),
      esc(date),
      esc(time),
      esc(timestamp),
      esc(s.device_type),
      esc(s.os),
      esc(s.country),
      esc(s.city),
      esc(s.referrer),
      s.is_returning ? "Yes" : "No",
      esc(events),
      leadVisitors.has(s.visitor_id) ? "Yes" : "No",
      hotLeadVisitors.has(s.visitor_id) ? "Yes" : "No",
      esc(s.visitor_id),
    ].join(",");
  });

  const csv = [headers.map(esc).join(","), ...rows].join("\n");
  const filename = `scans-${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
