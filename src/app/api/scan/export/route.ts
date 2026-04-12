import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, company, qr_label")
    .eq("user_id", ownerId);

  const rows = [[
    "QR Label", "Employee Name", "Company",
    "Timestamp", "Date", "Time",
    "Device", "OS", "Country", "City",
    "Referrer", "Returning Visitor", "Visitor ID",
  ]];

  if (!contacts || contacts.length === 0) {
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="scan-data.csv"`,
      },
    });
  }

  const contactIds = contacts.map((c) => c.id);
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]));

  const { data: scans } = await supabase
    .from("qr_scans")
    .select("contact_id, scanned_at, device_type, os, country, city, referrer, is_returning, visitor_id")
    .in("contact_id", contactIds)
    .order("scanned_at", { ascending: false });

  (scans ?? []).forEach((s) => {
    const c = contactMap[s.contact_id];
    if (!c) return;
    const label = c.qr_label || c.name || c.id;
    const name = c.name ?? "";
    const dt = s.scanned_at ? new Date(s.scanned_at) : null;
    const date = dt ? dt.toISOString().slice(0, 10) : "";
    const time = dt ? dt.toISOString().slice(11, 19) + " UTC" : "";
    const timestamp = dt ? dt.toISOString() : "";
    rows.push([
      label,
      name,
      c.company ?? "",
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

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="scan-data.csv"`,
    },
  });
}
