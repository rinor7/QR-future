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

  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();

  const isOwner = !profile || profile.owner_id === user.id;
  if (!isOwner) {
    return NextResponse.json({ isOwner: false });
  }

  const ownerId = user.id;

  const [subUsers, qrCodes, folders] = await Promise.all([
    supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("owner_id", ownerId).neq("user_id", ownerId),
    supabase.from("contacts").select("id",       { count: "exact", head: true }).eq("user_id", ownerId),
    supabase.from("folders").select("id",        { count: "exact", head: true }).eq("organization_id", ownerId),
  ]);

  const { data: contactIds } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", ownerId);
  const ids = (contactIds ?? []).map((c) => c.id);

  let scans = 0;
  let leads = 0;
  if (ids.length > 0) {
    const [scanRes, leadRes] = await Promise.all([
      supabase.from("qr_scans").select("id", { count: "exact", head: true }).in("contact_id", ids),
      supabase.from("qr_leads").select("id", { count: "exact", head: true }).in("contact_id", ids),
    ]);
    scans = scanRes.count ?? 0;
    leads = leadRes.count ?? 0;
  }

  return NextResponse.json({
    isOwner: true,
    subUsers: subUsers.count ?? 0,
    qrCodes:  qrCodes.count ?? 0,
    folders:  folders.count ?? 0,
    scans,
    leads,
  });
}
