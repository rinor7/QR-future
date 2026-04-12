import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hosts that are our own (not custom domains)
const OWN_HOSTS = new Set([
  "localhost",
  "qr-card.ch",
  "www.qr-card.ch",
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? [new URL(process.env.NEXT_PUBLIC_APP_URL).hostname]
    : []),
]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const isCustomDomain = host && !OWN_HOSTS.has(host) && !host.endsWith(".vercel.app");

  // Custom domain: only serve /qr/* and public pages — block dashboard access
  if (isCustomDomain) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(
        new URL(process.env.NEXT_PUBLIC_APP_URL ?? "/", request.url)
      );
    }
    // Let /qr/[id] and other public pages through with custom-domain header
    const res = NextResponse.next({ request });
    res.headers.set("x-custom-domain", host);
    return res;
  }

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
  matcher: ["/dashboard/:path*", "/login", "/qr/:path*"],
};
