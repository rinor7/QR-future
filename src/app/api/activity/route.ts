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

  // Get owner_id + platform-admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id, is_platform_admin")
    .eq("user_id", user.id)
    .single();
  const ownerId = profile?.owner_id ?? user.id;

  // Platform owner sees a curated feed of platform-wide events only: new users,
  // team invites/joins, account deletions, email changes, 2FA changes.
  // Scans, interactions, leads are NOT shown (they'd drown real platform signal).
  if (profile?.is_platform_admin) {
    const items: ActivityItem[] = [];

    // All org_notifications across every owner (account deletions, and any new
    // events we start logging — invite_sent, email_changed, mfa_enabled, etc.)
    const PLATFORM_NOTIFICATION_TYPES = [
      "user_deleted",
      "user_signed_up",
      "user_invited",
      "invite_accepted",
      "email_changed",
      "mfa_enabled",
      "mfa_disabled",
      "team_mfa_toggled",
    ];
    const { data: notes } = await supabase
      .from("org_notifications")
      .select("id, type, message, created_at")
      .in("type", PLATFORM_NOTIFICATION_TYPES)
      .order("created_at", { ascending: false })
      .limit(100);
    (notes ?? []).forEach((n, i) => {
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

    // Derive signup / invite-accepted events from profiles.created_at for
    // historical data (until we add explicit logging).
    const { data: recentProfiles } = await supabase
      .from("profiles")
      .select("user_id, email, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    (recentProfiles ?? []).forEach((p, i) => {
      const isOwner = p.user_id === p.owner_id;
      items.push({
        id: `profile-${p.user_id ?? i}`,
        type: "notification",
        qr_id: "",
        qr_label: p.email ?? "",
        notification_kind: isOwner ? "user_signed_up" : "invite_accepted",
        message: isOwner
          ? `New signup: ${p.email}`
          : `${p.email} joined a team`,
        ts: p.created_at,
      });
    });

    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return NextResponse.json(items.slice(0, 50));
  }

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
