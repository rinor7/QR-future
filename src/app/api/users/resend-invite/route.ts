import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, ownerId } = await req.json();

  if (!email || !ownerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Use generateLink to force a new invite email even for already-invited users.
  // inviteUserByEmail silently skips the email when the user already exists in auth.
  const { error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { owner_id: ownerId } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
