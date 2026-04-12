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

// GET /api/nfc — list all NFC cards for this org
export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = adminClient();
  const { data: profile } = await supabase.from("profiles").select("owner_id, role").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { data: cards, error } = await supabase
    .from("nfc_cards")
    .select("id, card_uid, label, contact_id, created_at, updated_at")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with contact name
  const contactIds = (cards ?? []).map((c) => c.contact_id).filter(Boolean);
  let contactMap: Record<string, string> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name, company")
      .in("id", contactIds);
    (contacts ?? []).forEach((c) => {
      contactMap[c.id] = c.name || c.company || c.id;
    });
  }

  return NextResponse.json(
    (cards ?? []).map((c) => ({
      ...c,
      contactName: c.contact_id ? (contactMap[c.contact_id] ?? "Unknown") : null,
    }))
  );
}

// POST /api/nfc — register a new card
export async function POST(req: NextRequest) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { card_uid, label, contact_id } = await req.json();
  if (!card_uid?.trim()) return NextResponse.json({ error: "card_uid is required" }, { status: 400 });

  const supabase = adminClient();
  const { data: profile } = await supabase.from("profiles").select("owner_id, role").eq("user_id", user.id).single();
  if (profile?.role === "reader" || profile?.role === "writer") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const ownerId = profile?.owner_id ?? user.id;

  const { data, error } = await supabase.from("nfc_cards").insert({
    card_uid: card_uid.trim().toUpperCase(),
    user_id: ownerId,
    label: label?.trim() || null,
    contact_id: contact_id || null,
  }).select().single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This card UID is already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
