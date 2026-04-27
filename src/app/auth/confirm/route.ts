import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const purpose = searchParams.get("purpose");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // The action succeeded if the exchange worked, OR if it failed but the
    // user still has a session (email-change links are often pre-consumed by
    // Supabase's verify endpoint before reaching us).
    let succeeded = !error;
    if (error) {
      const { data: { user } } = await supabase.auth.getUser();
      succeeded = !!user;
    }

    if (!succeeded) {
      return NextResponse.redirect(`${origin}/forgot-password?error=1`);
    }

    // For email changes: invalidate sessions on every device and force a fresh
    // sign-in with the new address.
    if (purpose === "email_change") {
      // Auto-unlink any OAuth identity whose email no longer matches the
      // new account email. Without this, a user who switched from gmail to
      // hotmail could still sign in via the original Google identity.
      // The RPC refuses to remove the last sign-in method, so users with
      // only an OAuth identity (no password) keep it.
      const { data: { user } } = await supabase.auth.getUser();
      const newEmail = (user?.email ?? "").toLowerCase();
      if (newEmail) {
        const { data: identityData } = await supabase.auth.getUserIdentities();
        const stale = (identityData?.identities ?? []).filter((i) => {
          if (i.provider === "email") return false;
          const idEmail = ((i.identity_data?.email as string | undefined) ?? "").toLowerCase();
          return idEmail !== newEmail;
        });
        for (const ident of stale) {
          await supabase.rpc("unlink_user_identity", { p_provider: ident.provider });
        }
      }

      await supabase.auth.signOut({ scope: "global" });
      const redirectRes = NextResponse.redirect(`${origin}/login?email_changed=1`);
      redirectRes.cookies.set("qr_login_ts", "", { path: "/", maxAge: 0 });
      return redirectRes;
    }

    const redirectRes = NextResponse.redirect(`${origin}${next}`);
    redirectRes.cookies.set("qr_login_ts", String(Math.floor(Date.now() / 1000)), {
      path: "/",
      maxAge: 28800,
      sameSite: "lax",
    });
    return redirectRes;
  }

  // No code in the query string — Supabase often puts the result in the URL
  // fragment instead (e.g. email-change "first link accepted, please click the
  // other one" messages). Browsers preserve the fragment across redirects, so
  // just send the user on to `next` and let the destination display it.
  return NextResponse.redirect(`${origin}${next}`);
}
