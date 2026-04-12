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

// Build "Folder A > Folder B > Folder C" path from flat folder list
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

// GET /api/qr/export?folder_id=xxx
export async function GET(req: NextRequest) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get("folder_id");

  const supabase = adminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;

  // Fetch all folders so we can build paths
  const { data: folders } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .eq("organization_id", ownerId);

  const folderMap = new Map<string, { name: string; parent_id: string | null }>();
  (folders ?? []).forEach((f) => folderMap.set(f.id, { name: f.name, parent_id: f.parent_id }));

  // Fetch contacts
  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, company, qr_label, folder_id, is_active, created_at")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  if (folderId) {
    contactsQuery = contactsQuery.eq("folder_id", folderId);
  }

  const { data: contacts } = await contactsQuery;

  if (!contacts || contacts.length === 0) {
    const header = `"QR Label","Name","Company","Folder","Status","Total Scans","Created"\n`;
    const filename = folderId
      ? `qr-codes-folder.csv`
      : `qr-codes.csv`;
    return new NextResponse(header, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Fetch scan counts for all contacts
  const contactIds = contacts.map((c) => c.id);
  const { data: scanCounts } = await supabase
    .from("qr_scans")
    .select("contact_id")
    .in("contact_id", contactIds);

  const countMap: Record<string, number> = {};
  (scanCounts ?? []).forEach((s) => {
    countMap[s.contact_id] = (countMap[s.contact_id] ?? 0) + 1;
  });

  // Build CSV rows
  const rows: string[][] = [[
    "QR Label", "Name", "Company", "Folder", "Status", "Total Scans", "Created",
  ]];

  contacts.forEach((c) => {
    const folderPath = buildFolderPath(c.folder_id, folderMap);
    const label = c.qr_label || c.name || c.id;
    const created = c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : "";
    rows.push([
      label,
      c.name ?? "",
      c.company ?? "",
      folderPath,
      c.is_active ? "Active" : "Paused",
      String(countMap[c.id] ?? 0),
      created,
    ]);
  });

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  // Use folder name in filename if filtering by folder
  let filename = "qr-codes.csv";
  if (folderId && folderMap.has(folderId)) {
    const folderName = folderMap.get(folderId)!.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    filename = `qr-codes-${folderName}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
