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
    .select("id, first_name, last_name, company, label")
    .eq("user_id", ownerId);

  if (!contacts || contacts.length === 0) {
    const csv = "QR Label,Name,Company,Scanned At\n";
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
    .select("contact_id, scanned_at")
    .in("contact_id", contactIds)
    .order("scanned_at", { ascending: false });

  const rows = [["QR Label", "Name", "Company", "Scanned At"]];
  (scans ?? []).forEach((s: { contact_id: string; scanned_at: string }) => {
    const c = contactMap[s.contact_id];
    if (!c) return;
    const label = c.label || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id;
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
    const date = new Date(s.scanned_at).toLocaleString("de-CH");
    rows.push([label, name, c.company ?? "", date]);
  });

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="scan-data.csv"`,
    },
  });
}
