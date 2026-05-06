import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function authedOwnerId(): Promise<{ userId: string; ownerId: string } | null> {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: prof } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  return { userId: user.id, ownerId: prof?.owner_id ?? user.id };
}

export async function POST(req: NextRequest) {
  const auth = await authedOwnerId();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = typeof body?.type === "string" ? body.type : "";
  const message = typeof body?.message === "string" ? body.message : "";
  const metadata = body?.metadata ?? null;
  if (!type || !message) {
    return NextResponse.json({ error: "type and message are required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.from("org_notifications").insert({
    owner_id: auth.ownerId,
    type,
    message,
    metadata,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await authedOwnerId();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  let q = supabase
    .from("org_notifications")
    .select("type, message, metadata, created_at")
    .eq("owner_id", auth.ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
