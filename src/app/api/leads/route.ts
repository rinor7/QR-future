import { NextResponse } from "next/server";
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

export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get owner id
  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;

  // Get all contacts for this org
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, qr_label, created_by")
    .eq("user_id", ownerId);

  const contactIds = (contacts ?? []).map((c) => c.id);
  if (contactIds.length === 0) return NextResponse.json([]);

  const contactMap: Record<string, { name: string; qr_label: string; created_by: string }> = {};
  (contacts ?? []).forEach((c) => { contactMap[c.id] = { name: c.name, qr_label: c.qr_label, created_by: c.created_by ?? "" }; });

  const { data: leads } = await supabase
    .from("qr_leads")
    .select("id, name, email, comment, consent, created_at, contact_id")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });

  const result = (leads ?? []).map((l) => ({
    ...l,
    qr_label: contactMap[l.contact_id]?.qr_label || null,
    contact_name: contactMap[l.contact_id]?.name || null,
    created_by: contactMap[l.contact_id]?.created_by || null,
  }));

  return NextResponse.json(result);
}
