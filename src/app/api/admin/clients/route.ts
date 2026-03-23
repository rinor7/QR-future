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

  // Verify platform admin
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  if (!myProfile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, plan, created_at, owner_id, last_activity_at, is_platform_admin, stripe_customer_id")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch QR counts
  const { data: contactRows } = await supabase
    .from("contacts")
    .select("user_id");

  const qrCounts: Record<string, number> = {};
  (contactRows ?? []).forEach((row: { user_id: string }) => {
    qrCounts[row.user_id] = (qrCounts[row.user_id] ?? 0) + 1;
  });

  // Only org owners (user_id = owner_id), excluding the platform admin
  const clients = (profiles ?? [])
    .filter((p) => p.user_id === p.owner_id && p.user_id !== user.id && !p.is_platform_admin)
    .map((p) => ({
      userId: p.user_id,
      email: p.email,
      plan: p.plan ?? "free",
      createdAt: p.created_at,
      qrCount: qrCounts[p.user_id] ?? 0,
      lastActivityAt: p.last_activity_at ?? null,
      hasStripe: !!p.stripe_customer_id,
    }));

  return NextResponse.json({ clients });
}
