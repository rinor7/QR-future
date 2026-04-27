import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const PLAN_ORDER = ["free", "star", "premium", "platinum"];

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type Row = { plan: string; price: number; features: string[]; features_en?: string[] | null };
  let data: Row[] | null = null;
  let error: { message: string } | null = null;
  {
    const r = await supabase
      .from("plan_config")
      .select("plan, price, features, features_en")
      .order("plan");
    data = r.data as Row[] | null;
    error = r.error;
  }
  // If the bilingual migration hasn't run yet, the features_en column won't
  // exist — fall back to the German-only shape so the page still renders.
  if (error) {
    const fallback = await supabase
      .from("plan_config")
      .select("plan, price, features")
      .order("plan");
    data = fallback.data as Row[] | null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = PLAN_ORDER
    .map((p) => data?.find((r) => r.plan === p))
    .filter(Boolean)
    .map((r) => ({ ...r, features_en: r!.features_en ?? r!.features ?? [] }));
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

  const { plan, price, features, features_en } = await req.json();

  if (!PLAN_ORDER.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { error } = await supabase
    .from("plan_config")
    .upsert({ plan, price, features, features_en }, { onConflict: "plan" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
