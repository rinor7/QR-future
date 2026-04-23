import { NextRequest, NextResponse } from "next/server";
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

// POST /api/folders/grant-creator
// Body: { contactId, folderId }
// When an admin moves a QR into a folder, the QR's creator gets "employee"
// access to that folder so they can see their own card in context. Does not
// downgrade higher existing roles.
export async function POST(req: NextRequest) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, folderId } = await req.json();
  if (!contactId || !folderId) {
    return NextResponse.json({ error: "Missing contactId or folderId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("owner_id, role")
    .eq("user_id", user.id)
    .single();
  if (!callerProfile) return NextResponse.json({ error: "Profile not found" }, { status: 403 });

  const isAdmin = callerProfile.owner_id === user.id || callerProfile.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Only admins can grant folder access" }, { status: 403 });

  const ownerId = callerProfile.owner_id;

  const { data: contact } = await supabase
    .from("contacts")
    .select("created_by, user_id")
    .eq("id", contactId)
    .single();
  if (!contact || contact.user_id !== ownerId) {
    return NextResponse.json({ error: "Contact not found in this org" }, { status: 404 });
  }

  const creatorEmail = contact.created_by as string | null;
  if (!creatorEmail) return NextResponse.json({ skipped: "no creator email" });

  const { data: creator } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", creatorEmail)
    .eq("owner_id", ownerId)
    .single();
  if (!creator?.user_id) return NextResponse.json({ skipped: "creator no longer in org" });

  // Don't downgrade — skip if they already have any role on this folder.
  const { data: existing } = await supabase
    .from("folder_permissions")
    .select("id")
    .eq("folder_id", folderId)
    .eq("user_id", creator.user_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ skipped: "already has access" });

  const { error } = await supabase.from("folder_permissions").insert({
    folder_id: folderId,
    user_id: creator.user_id,
    role: "employee",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ granted: true });
}
