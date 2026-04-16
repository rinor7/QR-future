import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface ActivityItem {
  id: string;
  type: "scan" | "interaction" | "lead" | "notification";
  qr_id: string;
  qr_label: string;
  event_type?: string;
  device_type?: string;
  country?: string;
  city?: string;
  lead_name?: string;
  notification_kind?: string;
  message?: string;
  ts: string;
}

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

  // Get owner_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;

  // Get all contacts for this org
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, qr_label")
    .eq("user_id", ownerId);

  const contactIds = (contacts ?? []).map((c) => c.id);
  if (contactIds.length === 0) return NextResponse.json([]);

  // Build label map: id → display label
  const labelMap: Record<string, string> = {};
  (contacts ?? []).forEach((c) => {
    labelMap[c.id] = c.qr_label || c.name || c.id;
  });

  // Fetch recent scans, interactions, leads, notifications in parallel
  const [scansRes, interactionsRes, leadsRes, notificationsRes] = await Promise.all([
    supabase
      .from("qr_scans")
      .select("id, contact_id, device_type, country, city, scanned_at")
      .in("contact_id", contactIds)
      .order("scanned_at", { ascending: false })
      .limit(30),
    supabase
      .from("qr_interactions")
      .select("id, contact_id, event_type, scanned_at")
      .in("contact_id", contactIds)
      .order("scanned_at", { ascending: false })
      .limit(30),
    supabase
      .from("qr_leads")
      .select("id, contact_id, name, created_at")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("org_notifications")
      .select("id, type, message, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const items: ActivityItem[] = [];

  (scansRes.data ?? []).forEach((s, i) => {
    items.push({
      id: `scan-${s.id ?? i}`,
      type: "scan",
      qr_id: s.contact_id,
      qr_label: labelMap[s.contact_id] ?? s.contact_id,
      device_type: s.device_type ?? undefined,
      country: s.country ?? undefined,
      city: s.city ?? undefined,
      ts: s.scanned_at,
    });
  });

  (interactionsRes.data ?? []).forEach((it, i) => {
    items.push({
      id: `interaction-${it.id ?? i}`,
      type: "interaction",
      qr_id: it.contact_id,
      qr_label: labelMap[it.contact_id] ?? it.contact_id,
      event_type: it.event_type ?? undefined,
      ts: it.scanned_at,
    });
  });

  (leadsRes.data ?? []).forEach((l, i) => {
    items.push({
      id: `lead-${l.id ?? i}`,
      type: "lead",
      qr_id: l.contact_id,
      qr_label: labelMap[l.contact_id] ?? l.contact_id,
      lead_name: l.name ?? undefined,
      ts: l.created_at,
    });
  });

  (notificationsRes.data ?? []).forEach((n, i) => {
    items.push({
      id: `notification-${n.id ?? i}`,
      type: "notification",
      qr_id: "",
      qr_label: n.message ?? "",
      notification_kind: n.type ?? undefined,
      message: n.message ?? undefined,
      ts: n.created_at,
    });
  });

  // Sort descending by time, cap at 50
  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return NextResponse.json(items.slice(0, 50));
}
