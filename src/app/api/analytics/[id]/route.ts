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

  // Verify ownership
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
    .select("scanned_at, device_type, os, country, city, referrer, is_returning, visitor_id")
    .eq("contact_id", contactId)
    .order("scanned_at", { ascending: false });

  // Fetch all interactions
  const { data: interactions } = await supabase
    .from("qr_interactions")
    .select("event_type, scanned_at, visitor_id")
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

  // Unique visitors — distinct visitor_ids (fallback: count non-returning as unique)
  const knownVisitorIds = new Set(s.map((r) => r.visitor_id).filter(Boolean));
  const uniqueByVisitorId = knownVisitorIds.size;
  // For scans without visitor_id (old data), count each as unique
  const scansWithoutVisitorId = s.filter((r) => !r.visitor_id).length;
  const totalUnique = uniqueByVisitorId + scansWithoutVisitorId;
  const returningCount = s.filter((r) => r.is_returning).length;

  // Visit frequency — how many times each visitor_id scanned
  const visitorFreq: Record<string, number> = {};
  s.forEach((r) => {
    if (r.visitor_id) visitorFreq[r.visitor_id] = (visitorFreq[r.visitor_id] ?? 0) + 1;
  });
  const freqBuckets = { once: 0, twice: 0, threeplus: 0 };
  Object.values(visitorFreq).forEach((count) => {
    if (count === 1) freqBuckets.once++;
    else if (count === 2) freqBuckets.twice++;
    else freqBuckets.threeplus++;
  });

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  s.forEach((r) => { const k = r.device_type ?? "Unknown"; deviceMap[k] = (deviceMap[k] ?? 0) + 1; });

  // OS breakdown
  const osMap: Record<string, number> = {};
  s.forEach((r) => { const k = r.os ?? "Unknown"; osMap[k] = (osMap[k] ?? 0) + 1; });

  // Country breakdown (top 10)
  const countryMap: Record<string, number> = {};
  s.forEach((r) => { if (r.country) countryMap[r.country] = (countryMap[r.country] ?? 0) + 1; });

  // Interaction breakdown
  const eventMap: Record<string, number> = {};
  ix.forEach((r) => { eventMap[r.event_type] = (eventMap[r.event_type] ?? 0) + 1; });

  // Hot leads — visitors who triggered a high-intent event (phone, email, save contact)
  const HIGH_INTENT = new Set(["click_phone", "click_email", "click_save_contact"]);
  const hotLeadIds = new Set(
    ix.filter((r) => r.visitor_id && HIGH_INTENT.has(r.event_type)).map((r) => r.visitor_id)
  );

  // Build per-visitor profile for hot leads
  const visitorScanMap: Record<string, { scanned_at: string; device_type: string; os: string; country: string; city: string; is_returning: boolean; scanCount: number }> = {};
  s.forEach((r) => {
    if (!r.visitor_id) return;
    if (!visitorScanMap[r.visitor_id]) {
      visitorScanMap[r.visitor_id] = { ...r, scanCount: 1 };
    } else {
      visitorScanMap[r.visitor_id].scanCount++;
      // Keep the most recent scan's metadata
      if (r.scanned_at > visitorScanMap[r.visitor_id].scanned_at) {
        visitorScanMap[r.visitor_id] = { ...visitorScanMap[r.visitor_id], ...r, scanCount: visitorScanMap[r.visitor_id].scanCount };
      }
    }
  });

  const visitorEventMap: Record<string, string[]> = {};
  ix.forEach((r) => {
    if (!r.visitor_id) return;
    if (!visitorEventMap[r.visitor_id]) visitorEventMap[r.visitor_id] = [];
    if (!visitorEventMap[r.visitor_id].includes(r.event_type)) {
      visitorEventMap[r.visitor_id].push(r.event_type);
    }
  });

  const hotLeads = Array.from(hotLeadIds)
    .map((vid) => ({
      visitorId: vid,
      scanCount: visitorScanMap[vid]?.scanCount ?? 1,
      lastSeen: visitorScanMap[vid]?.scanned_at ?? null,
      device: visitorScanMap[vid]?.device_type ?? null,
      os: visitorScanMap[vid]?.os ?? null,
      country: visitorScanMap[vid]?.country ?? null,
      city: visitorScanMap[vid]?.city ?? null,
      isReturning: visitorScanMap[vid]?.is_returning ?? false,
      events: visitorEventMap[vid] ?? [],
    }))
    .sort((a, b) => (b.scanCount - a.scanCount) || (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""))
    .slice(0, 20);

  return NextResponse.json({
    total: s.length,
    unique: totalUnique,
    returning: returningCount,
    new: s.length - returningCount,
    visitFrequency: freqBuckets,
    last30: Object.entries(days30).map(([date, count]) => ({ date, count })),
    devices: Object.entries(deviceMap).map(([name, count]) => ({ name, count })),
    os: Object.entries(osMap).map(([name, count]) => ({ name, count })),
    countries: Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
    interactions: Object.entries(eventMap).map(([event, count]) => ({ event, count })),
    recentScans: s.slice(0, 20),
    hotLeads,
  });
}
