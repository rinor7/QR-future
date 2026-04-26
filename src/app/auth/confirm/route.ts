import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
    if (!error) {
      const redirectRes = NextResponse.redirect(`${origin}${next}`);
      redirectRes.cookies.set("qr_login_ts", String(Math.floor(Date.now() / 1000)), {
        path: "/",
        maxAge: 28800,
        sameSite: "lax",
      });
      return redirectRes;
    }
    // Code was present but exchange failed (expired/already used)
    return NextResponse.redirect(`${origin}/forgot-password?error=1`);
  }

  // No code in the query string — Supabase often puts the result in the URL
  // fragment instead (e.g. email-change "first link accepted, please click the
  // other one" messages). Browsers preserve the fragment across redirects, so
  // just send the user on to `next` and let the destination display it.
  return NextResponse.redirect(`${origin}${next}`);
}
