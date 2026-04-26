import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oldEmail = user.email ?? "";
  if (oldEmail.toLowerCase() === newEmail) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Block if another auth user already owns the new address
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("email", newEmail)
    .neq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Diese E-Mail ist bereits vergeben." }, { status: 409 });
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  });
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  await supabase.from("profiles").update({ email: newEmail }).eq("user_id", user.id);

  const { data: prof } = await supabase
    .from("profiles")
    .select("owner_id")
    .eq("user_id", user.id)
    .single();
  const ownerIdForLog = prof?.owner_id ?? user.id;
  await supabase.from("org_notifications").insert({
    owner_id: ownerIdForLog,
    type: "email_changed",
    message: `${oldEmail} changed email to ${newEmail}`,
    metadata: { from: oldEmail, to: newEmail, user_id: user.id },
  });

  return NextResponse.json({ ok: true });
}
