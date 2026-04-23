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

export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();

  const ownerId = profile?.owner_id ?? user.id;

  const { data: teamProfiles } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("owner_id", ownerId);
  const teamIds = new Set((teamProfiles ?? []).map((p) => p.user_id));

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const result: Record<string, boolean> = {};
  for (const u of authList?.users ?? []) {
    if (teamIds.has(u.id)) {
      result[u.id] = !!u.email_confirmed_at;
    }
  }

  return NextResponse.json(result);
}
