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

  // Select `source` too so we can split NFC taps out of the total. Fall back
  // gracefully if the migration that added the column hasn't run yet — older
  // rows simply won't be tallied as NFC.
  type ScanRow = { contact_id: string; scanned_at?: string | null; visitor_id?: string | null; source?: string | null };
  let scans: ScanRow[] = [];
  {
    const r = await supabase
      .from("qr_scans")
      .select("contact_id, scanned_at, visitor_id, source")
      .in("contact_id", ids);
    if (r.error) {
      const fallback = await supabase
        .from("qr_scans")
        .select("contact_id, scanned_at, visitor_id")
        .in("contact_id", ids);
      scans = (fallback.data as ScanRow[] | null) ?? [];
    } else {
      scans = (r.data as ScanRow[] | null) ?? [];
    }
  }

  const { data: leadsData } = await supabase
    .from("qr_leads")
    .select("contact_id")
    .in("contact_id", ids);
  const leads = leadsData ?? [];

  type Agg = {
    total: number;
    nfc: number;
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
      nfc: 0,
      last7d: 0,
      visitors: new Set(),
      visitorlessUnique: 0,
      lastScanAt: null,
      leads: 0,
    });
  }

  for (const s of scans) {
    const a = agg.get(s.contact_id);
    if (!a) continue;
    a.total++;
    if (s.source === "nfc") a.nfc++;
    if (s.scanned_at && s.scanned_at >= since7d) a.last7d++;
    if (s.visitor_id) a.visitors.add(s.visitor_id);
    else a.visitorlessUnique++;
    if (s.scanned_at && (!a.lastScanAt || s.scanned_at > a.lastScanAt)) {
      a.lastScanAt = s.scanned_at;
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
      nfcScans: a.nfc,
      last7d: a.last7d,
      uniqueVisitors: unique,
      leads: a.leads,
      lastScanAt: a.lastScanAt,
      conversionRate: conversion,
    };
  }).sort((a, b) => b.totalScans - a.totalScans);

  return NextResponse.json({ rows });
}
