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

  // Get owner id
  const { data: profile } = await supabase
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  // Get optional contact filter from query param
  const contactId = req.nextUrl.searchParams.get("contact_id");

  // Fetch contacts owned by this user (to resolve names)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, company, qr_label")
    .eq("user_id", ownerId);

  const contactMap: Record<string, { name: string; qrLabel: string }> = {};
  (contacts ?? []).forEach((c) => {
    contactMap[c.id] = {
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company || "—",
      qrLabel: c.qr_label || c.id.slice(0, 8),
    };
  });

  // Build leads query
  let leadsQuery = supabase
    .from("qr_leads")
    .select("id, contact_id, visitor_id, name, email, company, consented_at, created_at")
    .in("contact_id", Object.keys(contactMap))
    .order("created_at", { ascending: false });

  if (contactId) {
    leadsQuery = leadsQuery.eq("contact_id", contactId);
  }

  const { data: leads } = await leadsQuery;

  if (!leads || leads.length === 0) {
    // Return empty CSV with headers only
    const csv = "Name,Email,Company,QR Code,Employee,Consented At,Captured At\n";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export.csv"`,
      },
    });
  }

  // Fetch interactions per visitor for this set of leads
  const visitorIds = leads.map((l) => l.visitor_id).filter(Boolean);
  let interactionMap: Record<string, string[]> = {};
  if (visitorIds.length > 0) {
    const { data: interactions } = await supabase
      .from("qr_interactions")
      .select("visitor_id, event_type")
      .in("visitor_id", visitorIds);
    (interactions ?? []).forEach((ix) => {
      if (!ix.visitor_id) return;
      if (!interactionMap[ix.visitor_id]) interactionMap[ix.visitor_id] = [];
      if (!interactionMap[ix.visitor_id].includes(ix.event_type)) {
        interactionMap[ix.visitor_id].push(ix.event_type);
      }
    });
  }

  function escapeCSV(val: string | null | undefined): string {
    if (!val) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headers = ["Name", "Email", "Company", "QR Code", "Employee", "Interactions", "Consented At", "Captured At"];
  const rows = leads.map((lead) => {
    const meta = contactMap[lead.contact_id] ?? { name: "—", qrLabel: lead.contact_id };
    const interactions = (interactionMap[lead.visitor_id] ?? []).join("; ");
    const date = (v: string) => v ? new Date(v).toISOString().replace("T", " ").slice(0, 19) : "";
    return [
      escapeCSV(lead.name),
      escapeCSV(lead.email),
      escapeCSV(lead.company),
      escapeCSV(meta.qrLabel),
      escapeCSV(meta.name),
      escapeCSV(interactions),
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
