import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard — redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session expiry: log out after 8 hours of inactivity
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginTs = request.cookies.get("qr_login_ts")?.value;
    const now = Math.floor(Date.now() / 1000);
    const EIGHT_HOURS = 28800;
    if (loginTs && now - parseInt(loginTs, 10) > EIGHT_HOURS) {
      return NextResponse.redirect(new URL("/api/auth/signout?expired=1", request.url));
    }
    // Refresh the cookie on every request so it resets on activity
    const res = NextResponse.next({ request });
    res.cookies.set("qr_login_ts", String(now), { path: "/", maxAge: 28800, sameSite: "lax" });
    return res;
  }

  // Already logged in — skip login page
  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
