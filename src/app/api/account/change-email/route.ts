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
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oldEmail = user.email ?? "";
  if (oldEmail.toLowerCase() === newEmail) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // Block OAuth-only users from changing email. Otherwise we'd be unable to
  // unlink the original Google/etc. identity afterwards (it'd be the user's
  // only sign-in path), and the old OAuth login would silently keep working.
  const { data: hasPassword } = await supabaseAuth.rpc("current_user_has_password");
  if (!hasPassword) {
    return NextResponse.json(
      { error: "set_password_required" },
      { status: 400 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Block if another auth user already owns the new address
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .ilike("email", newEmail)
    .neq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Diese E-Mail ist bereits vergeben." }, { status: 409 });
  }

  // Standard confirmation flow — Supabase emails the new address with a confirm
  // link. The change is NOT applied to auth.users.email until the user clicks it.
  // We deliberately do NOT update profiles.email here; the self-heal in the
  // settings page mirrors auth.users.email → profiles.email after confirmation.
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const { error } = await supabaseAuth.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard/settings&purpose=email_change` }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, pendingConfirmation: true });
}
