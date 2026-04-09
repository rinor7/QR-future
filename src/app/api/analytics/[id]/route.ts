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

  const contactId = params.id;

  // Verify the contact belongs to this user's org
  const { data: profile } = await supabase
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { data: contact } = await supabase
    .from("contacts").select("id, user_id")
    .eq("id", contactId).eq("user_id", ownerId).single();
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all scans
  const { data: scans } = await supabase
    .from("qr_scans")
    .select("scanned_at, device_type, os, country, city, referrer, is_returning")
    .eq("contact_id", contactId)
    .order("scanned_at", { ascending: false });

  // Fetch all interactions
  const { data: interactions } = await supabase
    .from("qr_interactions")
    .select("event_type, scanned_at")
    .eq("contact_id", contactId)
    .order("scanned_at", { ascending: false });

  const s = scans ?? [];
  const ix = interactions ?? [];

  // Last 30 days buckets
  const days30: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days30[d.toISOString().slice(0, 10)] = 0;
  }
  s.forEach((r) => {
    const day = r.scanned_at?.slice(0, 10);
    if (day && day in days30) days30[day]++;
  });

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  s.forEach((r) => {
    const k = r.device_type ?? "Unknown";
    deviceMap[k] = (deviceMap[k] ?? 0) + 1;
  });

  // OS breakdown
  const osMap: Record<string, number> = {};
  s.forEach((r) => {
    const k = r.os ?? "Unknown";
    osMap[k] = (osMap[k] ?? 0) + 1;
  });

  // Country breakdown (top 10)
  const countryMap: Record<string, number> = {};
  s.forEach((r) => {
    if (r.country) countryMap[r.country] = (countryMap[r.country] ?? 0) + 1;
  });

  // Interaction breakdown
  const eventMap: Record<string, number> = {};
  ix.forEach((r) => {
    eventMap[r.event_type] = (eventMap[r.event_type] ?? 0) + 1;
  });

  const returningCount = s.filter((r) => r.is_returning).length;
  const newCount = s.length - returningCount;

  return NextResponse.json({
    total: s.length,
    returning: returningCount,
    new: newCount,
    last30: Object.entries(days30).map(([date, count]) => ({ date, count })),
    devices: Object.entries(deviceMap).map(([name, count]) => ({ name, count })),
    os: Object.entries(osMap).map(([name, count]) => ({ name, count })),
    countries: Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    interactions: Object.entries(eventMap).map(([event, count]) => ({ event, count })),
    recentScans: s.slice(0, 20),
  });
}
