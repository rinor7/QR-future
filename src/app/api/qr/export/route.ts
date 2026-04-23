import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuth() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
  if (val === null || val === undefined) return "";
  return `"${String(val).replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get("folder_id");
  const supabase = adminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id, role, email")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;
  const role = profile?.role ?? "owner";

  // Folders for path building
  const { data: folders } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .eq("organization_id", ownerId);
  const folderMap = new Map<string, { name: string; parent_id: string | null }>();
  (folders ?? []).forEach((f) => folderMap.set(f.id, { name: f.name, parent_id: f.parent_id }));

  // Contacts
  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, company, qr_label, folder_id, is_active, created_at, lead_capture_enabled")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });
  if (role === "writer") {
    contactsQuery = contactsQuery.eq("created_by", profile?.email ?? "");
  }
  if (folderId) contactsQuery = contactsQuery.eq("folder_id", folderId);

  const { data: contacts } = await contactsQuery;
  if (!contacts || contacts.length === 0) {
    const header = `"QR Label","Employee Name","Company","Folder","Status","Lead Capture","Total Scans","Unique Visitors","Returning Visitors","Conversion Rate","Leads Captured","Top Country","Top Device","Last Scan","Created"\n`;
    return new NextResponse(header, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${folderId ? "qr-codes-folder" : "qr-codes"}.csv"`,
      },
    });
  }

  const contactIds = contacts.map((c) => c.id);

  // All scans for these contacts
  const { data: allScans } = await supabase
    .from("qr_scans")
    .select("contact_id, visitor_id, is_returning, country, device_type")
    .in("contact_id", contactIds);

  // All interactions for conversion rate
  const { data: allInteractions } = await supabase
    .from("qr_interactions")
    .select("contact_id, visitor_id")
    .in("contact_id", contactIds);

  // Last scan per contact
  const { data: lastScans } = await supabase
    .from("qr_scans")
    .select("contact_id, scanned_at")
    .in("contact_id", contactIds)
    .order("scanned_at", { ascending: false });

  // All leads counts
  const { data: allLeads } = await supabase
    .from("qr_leads")
    .select("contact_id")
    .in("contact_id", contactIds);

  // Build per-contact stats
  type ContactStats = {
    totalScans: number;
    uniqueVisitors: Set<string>;
    returningScans: number;
    countries: Record<string, number>;
    devices: Record<string, number>;
    visitorsWithInteractions: Set<string>;
    leadsCount: number;
    lastScan: string;
  };

  const statsMap: Record<string, ContactStats> = {};
  contactIds.forEach((id) => {
    statsMap[id] = {
      totalScans: 0, uniqueVisitors: new Set(), returningScans: 0,
      countries: {}, devices: {}, visitorsWithInteractions: new Set(),
      leadsCount: 0, lastScan: "",
    };
  });

  (allScans ?? []).forEach((s) => {
    const st = statsMap[s.contact_id];
    if (!st) return;
    st.totalScans++;
    if (s.visitor_id) st.uniqueVisitors.add(s.visitor_id);
    if (s.is_returning) st.returningScans++;
    if (s.country) st.countries[s.country] = (st.countries[s.country] ?? 0) + 1;
    if (s.device_type) st.devices[s.device_type] = (st.devices[s.device_type] ?? 0) + 1;
  });

  (allInteractions ?? []).forEach((ix) => {
    if (ix.visitor_id && statsMap[ix.contact_id]) {
      statsMap[ix.contact_id].visitorsWithInteractions.add(ix.visitor_id);
    }
  });

  (allLeads ?? []).forEach((l) => {
    if (statsMap[l.contact_id]) statsMap[l.contact_id].leadsCount++;
  });

  // Last scan date (first row per contact since ordered desc)
  const seenLastScan = new Set<string>();
  (lastScans ?? []).forEach((s) => {
    if (!seenLastScan.has(s.contact_id) && statsMap[s.contact_id]) {
      statsMap[s.contact_id].lastScan = s.scanned_at ?? "";
      seenLastScan.add(s.contact_id);
    }
  });

  const headers = [
    "QR Label", "Employee Name", "Company", "Folder", "Status", "Lead Capture",
    "Total Scans", "Unique Visitors", "Returning Visitors", "Conversion Rate",
    "Leads Captured", "Top Country", "Top Device", "Last Scan", "Created",
  ];

  const rows = contacts.map((c) => {
    const st = statsMap[c.id];
    const unique = st.uniqueVisitors.size;
    const converted = Array.from(st.uniqueVisitors).filter((v) => st.visitorsWithInteractions.has(v)).length;
    const convRate = unique > 0 ? `${Math.round((converted / unique) * 100)}%` : "0%";
    const topCountry = Object.entries(st.countries).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const topDevice = Object.entries(st.devices).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const lastScan = st.lastScan ? new Date(st.lastScan).toISOString().slice(0, 10) : "Never";
    const created = c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : "";
    const folderPath = buildFolderPath(c.folder_id, folderMap);

    return [
      esc(c.qr_label || c.name || c.id),
      esc(c.name),
      esc(c.company),
      esc(folderPath),
      c.is_active ? "Active" : "Paused",
      c.lead_capture_enabled ? "Enabled" : "Disabled",
      esc(st.totalScans),
      esc(unique),
      esc(st.returningScans),
      esc(convRate),
      esc(st.leadsCount),
      esc(topCountry),
      esc(topDevice),
      esc(lastScan),
      esc(created),
    ].join(",");
  });

  const csv = [headers.map(esc).join(","), ...rows].join("\n");
  let filename = "qr-codes.csv";
  if (folderId && folderMap.has(folderId)) {
    filename = `qr-codes-${folderMap.get(folderId)!.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
