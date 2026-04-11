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
    return NextResponse.json({ total: 0, unique: 0, returning: 0, last7: [], last30: [], interactions: [], topQR: [] });
  }

  const contactIds = contacts.map((c: { id: string }) => c.id);

  const range = req.nextUrl.searchParams.get("range") ?? "7";
  const days = range === "30" ? 30 : 7;

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  // All scans (no date filter for totals)
  const { data: allScans } = await supabase
    .from("qr_scans")
    .select("contact_id, scanned_at, visitor_id, is_returning")
    .in("contact_id", contactIds);

  const s = allScans ?? [];

  // Unique visitors
  const knownVisitors = new Set(s.map((r) => r.visitor_id).filter(Boolean));
  const scansWithoutVid = s.filter((r) => !r.visitor_id).length;
  const uniqueVisitors = knownVisitors.size + scansWithoutVid;
  const returningCount = s.filter((r) => r.is_returning).length;

  // Chart buckets for selected range
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  s.forEach((r) => {
    const day = r.scanned_at?.slice(0, 10);
    if (day && day in buckets) buckets[day]++;
  });
  const chartData = Object.entries(buckets).map(([date, count]) => ({ date, count }));

  // Top performing QR codes (top 5 by total scans)
  const qrCounts: Record<string, number> = {};
  s.forEach((r) => { qrCounts[r.contact_id] = (qrCounts[r.contact_id] ?? 0) + 1; });
  const topQRIds = Object.entries(qrCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  // Interaction totals across all QR codes
  const { data: allInteractions } = await supabase
    .from("qr_interactions")
    .select("event_type")
    .in("contact_id", contactIds);

  const eventMap: Record<string, number> = {};
  (allInteractions ?? []).forEach((r) => {
    eventMap[r.event_type] = (eventMap[r.event_type] ?? 0) + 1;
  });
  const interactions = Object.entries(eventMap)
    .sort((a, b) => b[1] - a[1])
    .map(([event, count]) => ({ event, count }));

  return NextResponse.json({
    total: s.length,
    unique: uniqueVisitors,
    returning: returningCount,
    chart: chartData,
    interactions,
    topQR: topQRIds,
  });
}
