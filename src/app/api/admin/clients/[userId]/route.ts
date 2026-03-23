import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
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

  // Verify platform admin
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  if (!myProfile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = params;

  // Fetch client profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, email, plan, created_at, last_activity_at, stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all team members in this org
  const { data: members } = await supabase
    .from("profiles")
    .select("user_id, email, role, created_at")
    .eq("owner_id", userId)
    .neq("user_id", userId);

  // Fetch QR codes
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, qr_label, name, company, created_at, updated_at, is_active")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Fetch scan counts for these QR codes
  const contactIds = (contacts ?? []).map((c) => c.id);
  const scanCounts: Record<string, number> = {};

  if (contactIds.length > 0) {
    const { data: scans } = await supabase
      .from("qr_scans")
      .select("contact_id")
      .in("contact_id", contactIds);

    (scans ?? []).forEach((s: { contact_id: string }) => {
      scanCounts[s.contact_id] = (scanCounts[s.contact_id] ?? 0) + 1;
    });
  }

  const qrCodes = (contacts ?? []).map((c) => ({
    id: c.id,
    label: c.qr_label || c.name || "Unnamed",
    company: c.company || "",
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    isActive: c.is_active ?? true,
    scans: scanCounts[c.id] ?? 0,
  }));

  return NextResponse.json({
    profile: {
      userId: profile.user_id,
      email: profile.email,
      plan: profile.plan ?? "free",
      createdAt: profile.created_at,
      lastActivityAt: profile.last_activity_at ?? null,
      hasStripe: !!profile.stripe_customer_id,
    },
    members: (members ?? []).map((m) => ({
      email: m.email,
      role: m.role,
      joinedAt: m.created_at,
    })),
    qrCodes,
    totalScans: Object.values(scanCounts).reduce((a, b) => a + b, 0),
  });
}
