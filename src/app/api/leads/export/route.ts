import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

  const contactId = req.nextUrl.searchParams.get("contact_id");

  // Fetch contacts — uses name (single column), not first_name/last_name
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, qr_label")
    .eq("user_id", ownerId);

  const contactMap: Record<string, { name: string; qrLabel: string }> = {};
  (contacts ?? []).forEach((c) => {
    contactMap[c.id] = {
      name: c.name || "—",
      qrLabel: c.qr_label || c.id.slice(0, 8),
    };
  });

  const contactIds = Object.keys(contactMap);
  if (contactIds.length === 0) {
    const csv = "Name,Email,Comment,QR Code,Employee,Consented At,Captured At\n";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export.csv"`,
      },
    });
  }

  let leadsQuery = supabase
    .from("qr_leads")
    .select("id, contact_id, visitor_id, name, email, comment, consented_at, created_at")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });

  if (contactId) {
    leadsQuery = leadsQuery.eq("contact_id", contactId);
  }

  const { data: leads } = await leadsQuery;

  const emptyHeaders = "Name,Email,Comment,QR Code,Employee,Consented At,Captured At\n";

  if (!leads || leads.length === 0) {
    return new NextResponse(emptyHeaders, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export.csv"`,
      },
    });
  }

  function escapeCSV(val: string | null | undefined): string {
    if (!val) return "";
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  }

  const headers = ["Name", "Email", "Comment", "QR Code", "Employee", "Consented At", "Captured At"];
  const rows = leads.map((lead) => {
    const meta = contactMap[lead.contact_id] ?? { name: "—", qrLabel: lead.contact_id };
    const date = (v: string) => v ? new Date(v).toISOString().replace("T", " ").slice(0, 19) : "";
    return [
      escapeCSV(lead.name),
      escapeCSV(lead.email),
      escapeCSV(lead.comment),
      escapeCSV(meta.qrLabel),
      escapeCSV(meta.name),
      date(lead.consented_at),
      date(lead.created_at),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = contactId
    ? `leads-${contactMap[contactId]?.qrLabel ?? contactId}.csv`
    : "leads-all-export.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
