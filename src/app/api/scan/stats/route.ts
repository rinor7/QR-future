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

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ total: 0, last7: [] });
  }

  const contactIds = contacts.map((c: { id: string }) => c.id);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: scans } = await supabase
    .from("qr_scans")
    .select("scanned_at")
    .in("contact_id", contactIds);

  const total = scans?.length ?? 0;

  // Build last 7 days array
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }

  (scans ?? []).forEach((s: { scanned_at: string }) => {
    const day = s.scanned_at?.slice(0, 10);
    const entry = days.find((d) => d.date === day);
    if (entry) entry.count++;
  });

  return NextResponse.json({ total, last7: days });
}
