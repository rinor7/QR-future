import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getOwner(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("profiles").select("owner_id, role").eq("user_id", userId).single();
  return { supabase, ownerId: data?.owner_id ?? userId, role: data?.role ?? "admin" };
}

// POST /api/custom-domain — save domain + attempt Vercel registration
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain } = await req.json();
  const { supabase, ownerId, role } = await getOwner(user.id);

  // Only owner or admin can set custom domain
  if (role === "writer") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Validate domain format
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  if (domain && !domainRegex.test(domain)) {
    return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
  }

  // Save domain in profiles
  await supabase
    .from("profiles")
    .update({ custom_domain: domain || null, custom_domain_verified: false })
    .eq("user_id", ownerId);

  // Try to register with Vercel programmatically
  let vercelStatus: "registered" | "manual" | "removed" = "manual";
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (domain && vercelToken && vercelProjectId) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        }
      );
      if (res.ok || res.status === 409 /* already exists */) {
        vercelStatus = "registered";
      }
    } catch {
      // Fall back to manual
    }
  } else if (!domain) {
    vercelStatus = "removed";
    // Remove from Vercel if previously added
    if (vercelToken && vercelProjectId) {
      const { data: prev } = await supabase
        .from("profiles").select("custom_domain").eq("user_id", ownerId).single();
      if (prev?.custom_domain) {
        await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${prev.custom_domain}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${vercelToken}` },
          }
        ).catch(() => {});
      }
    }
  }

  return NextResponse.json({
    ok: true,
    domain: domain || null,
    vercelStatus,
    // CNAME instructions
    cname: {
      host: domain || "",
      target: process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        : "cname.vercel-dns.com",
    },
  });
}

// GET /api/custom-domain — check DNS verification status
export async function GET() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, ownerId } = await getOwner(user.id);
  const { data: profile } = await supabase
    .from("profiles").select("custom_domain, custom_domain_verified").eq("user_id", ownerId).single();

  if (!profile?.custom_domain) {
    return NextResponse.json({ domain: null, verified: false });
  }

  // Check with Vercel API if token available
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  let verified = profile.custom_domain_verified ?? false;

  if (vercelToken && vercelProjectId) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${profile.custom_domain}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        verified = data.verified === true;
        if (verified !== profile.custom_domain_verified) {
          await supabase
            .from("profiles")
            .update({ custom_domain_verified: verified })
            .eq("user_id", ownerId);
        }
      }
    } catch {
      // Ignore
    }
  }

  return NextResponse.json({ domain: profile.custom_domain, verified });
}
