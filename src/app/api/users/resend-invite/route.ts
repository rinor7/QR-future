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

  // Find the existing user (if any) so we can preserve their profile data
  // and clean up the auth row before re-inviting.
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  // Pull profile data so the role/owner/name survive the auth-user delete.
  let role = "writer";
  let firstName = "";
  let lastName = "";
  if (existing) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, owner_id")
      .eq("user_id", existing.id)
      .single();
    if (prof) {
      role = prof.role ?? role;
      firstName = prof.first_name ?? "";
      lastName = prof.last_name ?? "";
    }

    // Block resend for already-active users (they don't need an invite).
    if (existing.last_sign_in_at) {
      return NextResponse.json(
        { error: "This user has already signed in." },
        { status: 409 }
      );
    }

    // Delete the unconfirmed auth row (cascades to profile, identities).
    // Without this, inviteUserByEmail silently no-ops because the user exists.
    const { error: delErr } = await supabase.auth.admin.deleteUser(existing.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  }

  // Issue a fresh invite — this is the call that actually triggers the email.
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, owner_id: ownerId },
  });

  if (inviteError || !inviteData.user) {
    return NextResponse.json({ error: inviteError?.message ?? "Invite failed" }, { status: 500 });
  }

  // Re-upsert profile so role / owner / name carry over.
  await supabase.from("profiles").upsert({
    user_id: inviteData.user.id,
    email,
    role,
    owner_id: ownerId,
    first_name: firstName,
    last_name: lastName,
  });

  return NextResponse.json({ success: true });
}
