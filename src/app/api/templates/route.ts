import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getAuthedUser() {
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
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { data, error } = await supabase
    .from("qr_templates")
    .select("*")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, primary_color, theme, bg_image_url, show_logo_in_qr, lead_capture_enabled,
    company, logo_url, website, description,
    linkedin_url, instagram_url, facebook_url, tiktok_url, snapchat_url, x_url, other_social_url,
    qr_dot_style, qr_corner_style, qr_dot_color, qr_bg_color, qr_gradient, qr_gradient_color,
    locked_fields,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles").select("owner_id").eq("user_id", user.id).single();
  const ownerId = profile?.owner_id ?? user.id;

  const { data, error } = await supabase.from("qr_templates").insert({
    user_id: ownerId,
    name: name.trim(),
    primary_color: primary_color ?? "#2563eb",
    theme: theme ?? "classic",
    bg_image_url: bg_image_url ?? null,
    show_logo_in_qr: show_logo_in_qr ?? true,
    lead_capture_enabled: lead_capture_enabled ?? false,
    company: company ?? null,
    logo_url: logo_url ?? null,
    website: website ?? null,
    description: description ?? null,
    linkedin_url: linkedin_url ?? null,
    instagram_url: instagram_url ?? null,
    facebook_url: facebook_url ?? null,
    tiktok_url: tiktok_url ?? null,
    snapchat_url: snapchat_url ?? null,
    x_url: x_url ?? null,
    other_social_url: other_social_url ?? null,
    qr_dot_style: qr_dot_style ?? null,
    qr_corner_style: qr_corner_style ?? null,
    qr_dot_color: qr_dot_color ?? null,
    qr_bg_color: qr_bg_color ?? null,
    qr_gradient: qr_gradient ?? false,
    qr_gradient_color: qr_gradient_color ?? null,
    locked_fields: locked_fields ?? [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
