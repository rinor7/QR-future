import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PATCH /api/nfc/[id] — reassign or relabel a card
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = adminClient();
  const { data: profile } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("contact_id" in body) updates.contact_id = body.contact_id || null;
  if ("label" in body) updates.label = body.label?.trim() || null;

  const { data, error } = await supabase
    .from("nfc_cards")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", ownerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/nfc/[id] — remove a card
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = adminClient();
  const { data: profile } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { error } = await supabase
    .from("nfc_cards")
    .delete()
    .eq("id", params.id)
    .eq("user_id", ownerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
