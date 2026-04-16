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

  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id, role, is_platform_admin, first_name, last_name, email")
    .eq("user_id", user.id)
    .single();

  if (profile?.is_platform_admin) {
    return NextResponse.json({ error: "Platform admin accounts cannot be deleted this way." }, { status: 403 });
  }

  const errors: string[] = [];
  async function step(label: string, p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      console.error(`[account/delete] ${label}:`, error.message);
      errors.push(`${label}: ${error.message}`);
    }
  }

  const isOwner = !profile || profile.owner_id === user.id;

  if (isOwner) {
    // Owner: wipe the entire org
    const ownerId = user.id;

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", ownerId);
    const contactIds = (contacts ?? []).map((c) => c.id);

    if (contactIds.length > 0) {
      await step("delete qr_scans",        supabase.from("qr_scans").delete().in("contact_id", contactIds));
      await step("delete qr_interactions", supabase.from("qr_interactions").delete().in("contact_id", contactIds));
      await step("delete qr_leads",        supabase.from("qr_leads").delete().in("contact_id", contactIds));
    }

    await step("delete contacts",  supabase.from("contacts").delete().eq("user_id", ownerId));
    await step("delete nfc_cards", supabase.from("nfc_cards").delete().eq("user_id", ownerId));

    // Folders: null parents first (ON DELETE RESTRICT trap), then delete
    await step("null folder parents", supabase.from("folders").update({ parent_id: null }).eq("organization_id", ownerId));
    await step("delete folder_permissions", supabase.from("folder_permissions").delete().eq("user_id", ownerId));
    await step("delete folders",     supabase.from("folders").delete().eq("organization_id", ownerId));

    // Notifications scoped to this org
    await step("delete org_notifications", supabase.from("org_notifications").delete().eq("owner_id", ownerId));

    // Sub-users: wipe their auth + profiles
    const { data: subProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("owner_id", ownerId)
      .neq("user_id", ownerId);

    for (const sub of subProfiles ?? []) {
      const { error } = await supabase.auth.admin.deleteUser(sub.user_id);
      if (error) errors.push(`delete sub-user ${sub.user_id}: ${error.message}`);
    }

    await step("delete owner profile", supabase.from("profiles").delete().eq("user_id", ownerId));

    const { error: authErr } = await supabase.auth.admin.deleteUser(ownerId);
    if (authErr) errors.push(`delete owner auth: ${authErr.message}`);

  } else {
    // Sub-user leaves the org. Keep their QR cards under the admin, tag them
    // as "creator departed" so the dashboard can flag them.
    const subEmail = profile?.email ?? user.email ?? "";
    const subName  = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
    const ownerId  = profile!.owner_id as string;

    if (subEmail) {
      await step(
        "flag contacts as creator-departed",
        supabase
          .from("contacts")
          .update({ original_creator_deleted: true })
          .eq("user_id", ownerId)
          .eq("created_by", subEmail)
      );
    }

    // Folders created by this sub-user: clean up so auth.users FK doesn't block delete
    await step("null folder parents (sub-user)", supabase.from("folders").update({ parent_id: null }).eq("created_by", user.id));
    await step("delete folder_permissions (sub-user)", supabase.from("folder_permissions").delete().eq("user_id", user.id));
    await step("delete folders created by sub-user",   supabase.from("folders").delete().eq("created_by", user.id));

    // Log an activity-feed notification for the admin
    const displayName = subName || subEmail || "A team member";
    await step(
      "insert org notification",
      supabase.from("org_notifications").insert({
        owner_id: ownerId,
        type: "user_deleted",
        message: `${displayName} deleted their account`,
        metadata: { email: subEmail, name: subName, role: profile?.role ?? null },
      })
    );

    await step("delete sub-user profile", supabase.from("profiles").delete().eq("user_id", user.id));
    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
    if (authErr) errors.push(`delete sub-user auth: ${authErr.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Some deletion steps failed. Contact support.", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
