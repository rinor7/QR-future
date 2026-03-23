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
    .select("id")
    .eq("user_id", ownerId);

  if (!contacts || contacts.length === 0) return NextResponse.json({ counts: {} });

  const contactIds = contacts.map((c: { id: string }) => c.id);

  const { data: scans } = await supabase
    .from("qr_scans")
    .select("contact_id")
    .in("contact_id", contactIds);

  const counts: Record<string, number> = {};
  (scans ?? []).forEach((s: { contact_id: string }) => {
    counts[s.contact_id] = (counts[s.contact_id] ?? 0) + 1;
  });

  return NextResponse.json({ counts });
}
