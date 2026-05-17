import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLAN_ORDER = ["free", "growth", "business", "enterprise"];

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type Row = {
    plan: string;
    price: number;
    price_yearly?: number | null;
    qr_limit?: number | null;
    team_limit?: number | null;
    features: string[];
    features_en?: string[] | null;
  };
  const r = await supabase
    .from("plan_config")
    .select("plan, price, price_yearly, qr_limit, team_limit, features, features_en")
    .order("plan");
  const data = r.data as Row[] | null;
  const error = r.error;

  if (error) {
    console.error("[plan-config] select error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  // PLAN_LIMITS-style fallback values match the legacy code constants
  // so older rows without qr_limit/team_limit still render sensibly.
  const QR_FALLBACK: Record<string, number> = { free: 1, growth: 10, business: 100, enterprise: -1 };
  const TEAM_FALLBACK: Record<string, number> = { free: 1, growth: 3, business: 10, enterprise: -1 };

  const sorted = PLAN_ORDER
    .map((p) => data?.find((r) => r.plan === p))
    .filter(Boolean)
    .map((r) => ({
      ...r,
      price_yearly: r!.price_yearly ?? 0,
      qr_limit: r!.qr_limit ?? QR_FALLBACK[r!.plan] ?? 1,
      team_limit: r!.team_limit ?? TEAM_FALLBACK[r!.plan] ?? 1,
      features_en: r!.features_en ?? r!.features ?? [],
    }));
  return NextResponse.json({ plans: sorted });
}

export async function POST(req: NextRequest) {
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
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { plan, price, price_yearly, qr_limit, team_limit, features, features_en } = await req.json();

  if (!PLAN_ORDER.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const payload: Record<string, unknown> = { plan, price, features, features_en };
  if (typeof price_yearly === "number") payload.price_yearly = price_yearly;
  if (typeof qr_limit === "number") payload.qr_limit = qr_limit;
  if (typeof team_limit === "number") payload.team_limit = team_limit;

  const { error } = await supabase
    .from("plan_config")
    .upsert(payload, { onConflict: "plan" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
