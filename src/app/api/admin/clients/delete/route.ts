import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();

  if (!myProfile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete storage files for all contacts in this org
  const { data: contactRows } = await supabase
    .from("contacts")
    .select("logo_url, pdf_url, links")
    .eq("user_id", userId);

  if (contactRows && contactRows.length > 0) {
    const marker = "/storage/v1/object/public/Uploads/";
    const paths: string[] = [];
    for (const row of contactRows) {
      if (row.logo_url) {
        const idx = row.logo_url.indexOf(marker);
        if (idx !== -1) paths.push(row.logo_url.slice(idx + marker.length));
      }
      if (row.pdf_url) {
        const idx = row.pdf_url.indexOf(marker);
        if (idx !== -1) paths.push(row.pdf_url.slice(idx + marker.length));
      }
      if (Array.isArray(row.links)) {
        for (const link of row.links) {
          if (link.url) {
            const idx = link.url.indexOf(marker);
            if (idx !== -1) paths.push(link.url.slice(idx + marker.length));
          }
        }
      }
    }
    if (paths.length > 0) {
      await supabase.storage.from("Uploads").remove(paths);
    }
  }

  // Delete contacts, team profiles, then auth user
  await supabase.from("contacts").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("owner_id", userId);
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
