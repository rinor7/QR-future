import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, role, ownerId, firstName, lastName } = await req.json();

  if (!email || !role || !ownerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, owner_id: ownerId },
  });

  let userId: string | null = null;

  if (inviteError) {
    // User already exists — find their ID
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find((u) => u.email === email);
    if (!existing) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
    userId = existing.id;
  } else {
    userId = inviteData.user?.id ?? null;
  }

  // Upsert profile with correct role + owner_id + name
  if (userId) {
    await supabase.from("profiles").upsert({
      user_id: userId,
      email,
      role,
      owner_id: ownerId,
      first_name: firstName ?? "",
      last_name: lastName ?? "",
    });
  }

  return NextResponse.json({ success: true });
}
