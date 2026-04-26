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
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, qr_label, name, company")
    .eq("user_id", ownerId)
    .eq("is_active", true);

  const ids = (contacts ?? []).map((c) => c.id);
  if (ids.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [scansRes, leadsRes] = await Promise.all([
    supabase
      .from("qr_scans")
      .select("contact_id, scanned_at, visitor_id")
      .in("contact_id", ids),
    supabase
      .from("qr_leads")
      .select("contact_id")
      .in("contact_id", ids),
  ]);

  const scans = scansRes.data ?? [];
  const leads = leadsRes.data ?? [];

  type Agg = {
    total: number;
    last7d: number;
    visitors: Set<string>;
    visitorlessUnique: number;
    lastScanAt: string | null;
    leads: number;
  };
  const agg = new Map<string, Agg>();
  for (const id of ids) {
    agg.set(id, {
      total: 0,
      last7d: 0,
      visitors: new Set(),
      visitorlessUnique: 0,
      lastScanAt: null,
      leads: 0,
    });
  }

  for (const s of scans) {
    const a = agg.get(s.contact_id as string);
    if (!a) continue;
    a.total++;
    if (s.scanned_at && (s.scanned_at as string) >= since7d) a.last7d++;
    if (s.visitor_id) a.visitors.add(s.visitor_id as string);
    else a.visitorlessUnique++;
    if (s.scanned_at && (!a.lastScanAt || (s.scanned_at as string) > a.lastScanAt)) {
      a.lastScanAt = s.scanned_at as string;
    }
  }

  for (const l of leads) {
    const a = agg.get(l.contact_id as string);
    if (a) a.leads++;
  }

  const rows = (contacts ?? []).map((c) => {
    const a = agg.get(c.id)!;
    const unique = a.visitors.size + a.visitorlessUnique;
    const conversion = unique > 0 ? Math.round((a.leads / unique) * 100) : 0;
    return {
      id: c.id,
      label: (c.qr_label as string) || (c.name as string) || (c.company as string) || c.id,
      name: c.name as string,
      company: c.company as string,
      totalScans: a.total,
      last7d: a.last7d,
      uniqueVisitors: unique,
      leads: a.leads,
      lastScanAt: a.lastScanAt,
      conversionRate: conversion,
    };
  }).sort((a, b) => b.totalScans - a.totalScans);

  return NextResponse.json({ rows });
}
