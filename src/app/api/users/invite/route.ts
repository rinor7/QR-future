import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, role, ownerId } = await req.json();

  if (!email || !role || !ownerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Invite user via Supabase Auth
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, owner_id: ownerId },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Pre-create the profile so the role and owner_id are set immediately
  if (data.user) {
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      email,
      role,
      owner_id: ownerId,
    });
  }

  return NextResponse.json({ success: true });
}
