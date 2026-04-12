import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuth() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

export async function DELETE() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get profile to determine if owner or sub-user
  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id, role, is_platform_admin")
    .eq("user_id", user.id)
    .single();

  // Platform admins cannot delete their own account via this route
  if (profile?.is_platform_admin) {
    return NextResponse.json({ error: "Platform admin accounts cannot be deleted this way." }, { status: 403 });
  }

  const isOwner = !profile || profile.owner_id === user.id;

  if (isOwner) {
    // Owner: delete everything for the entire org
    const ownerId = user.id;

    // 1. Delete all scan data for this org's contacts
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", ownerId);
    const contactIds = (contacts ?? []).map((c) => c.id);

    if (contactIds.length > 0) {
      await supabase.from("qr_scans").delete().in("contact_id", contactIds);
      await supabase.from("interactions").delete().in("contact_id", contactIds);
    }

    // 2. Delete all contacts
    await supabase.from("contacts").delete().eq("user_id", ownerId);

    // 3. Delete NFC cards
    await supabase.from("nfc_cards").delete().eq("user_id", ownerId);

    // 4. Delete folders
    await supabase.from("folders").delete().eq("organization_id", ownerId);

    // 5. Delete all sub-user profiles + their auth accounts
    const { data: subProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("owner_id", ownerId)
      .neq("user_id", ownerId);

    for (const sub of subProfiles ?? []) {
      await supabase.auth.admin.deleteUser(sub.user_id);
    }

    // 6. Delete owner profile
    await supabase.from("profiles").delete().eq("user_id", ownerId);

    // 7. Delete the owner auth account (last — invalidates this session)
    await supabase.auth.admin.deleteUser(ownerId);

  } else {
    // Sub-user: only delete their own profile + auth account
    await supabase.from("profiles").delete().eq("user_id", user.id);
    await supabase.auth.admin.deleteUser(user.id);
  }

  return NextResponse.json({ success: true });
}
