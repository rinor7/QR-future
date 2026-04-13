import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, role, ownerId, firstName, lastName } = await req.json();

  if (!email || !role || !ownerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Block invites into a platform admin's account
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", ownerId)
    .single();
  if (ownerProfile?.is_platform_admin) {
    return NextResponse.json({ error: "Platform admin accounts cannot have team members." }, { status: 403 });
  }

  // Check if this email already exists anywhere on the platform
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    // Check if they already have a profile (i.e. they're active on the platform)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, owner_id")
      .eq("user_id", existingUser.id)
      .single();

    if (existingProfile) {
      // Allow re-invite only if they already belong to this same org
      if (existingProfile.owner_id !== ownerId) {
        return NextResponse.json(
          { error: "This email already exists on the platform under another account. Each user can only belong to one organization." },
          { status: 409 }
        );
      }
    }
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, owner_id: ownerId },
  });

  let userId: string | null = null;

  if (inviteError) {
    // User already exists in auth (pending invite or existing) — use their ID
    if (!existingUser) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
    userId = existingUser.id;
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
