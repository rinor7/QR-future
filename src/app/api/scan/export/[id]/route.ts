import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;

  // Verify the contact belongs to this user's org
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, company, qr_label")
    .eq("id", params.id)
    .eq("user_id", ownerId)
    .single();

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const label = contact.qr_label || contact.name || contact.id;
  const name = contact.name ?? "";

  // Fetch all scans for this QR code
  const { data: scans } = await supabase
    .from("qr_scans")
    .select("scanned_at, device_type, os, country, city, referrer, is_returning, visitor_id")
    .eq("contact_id", params.id)
    .order("scanned_at", { ascending: false });

  const rows = [[
    "QR Label", "Employee Name", "Company",
    "Timestamp", "Date", "Time",
    "Device", "OS", "Country", "City",
    "Referrer", "Returning Visitor", "Visitor ID",
  ]];

  (scans ?? []).forEach((s) => {
    const dt = s.scanned_at ? new Date(s.scanned_at) : null;
    const date = dt ? dt.toISOString().slice(0, 10) : "";
    const time = dt ? dt.toISOString().slice(11, 19) + " UTC" : "";
    const timestamp = dt ? dt.toISOString() : "";
    rows.push([
      label,
      name,
      contact.company ?? "",
      timestamp,
      date,
      time,
      s.device_type ?? "",
      s.os ?? "",
      s.country ?? "",
      s.city ?? "",
      s.referrer ?? "",
      s.is_returning ? "Yes" : "No",
      s.visitor_id ?? "",
    ]);
  });

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const filename = `scans-${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
