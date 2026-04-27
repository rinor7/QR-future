import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Logs a new-signup event so it appears in the Platform Owner activity feed.
// Called from the register flow after Supabase confirms the new account.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the platform owner so the notification has a valid owner_id
  const { data: platform } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("is_platform_admin", true)
    .limit(1)
    .maybeSingle();

  if (!platform?.user_id) return NextResponse.json({ ok: true, skipped: true });

  await supabase.from("org_notifications").insert({
    owner_id: platform.user_id,
    type: "user_signed_up",
    message: `New signup: ${email}`,
    metadata: { email },
  });

  return NextResponse.json({ ok: true });
}
