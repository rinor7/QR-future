import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function parseDevice(ua: string): { device_type: string; os: string } {
  const u = ua.toLowerCase();

  let os = "Unknown";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ipod")) os = "iOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("windows")) os = "Windows";
  else if (u.includes("mac os") || u.includes("macintosh")) os = "macOS";
  else if (u.includes("linux")) os = "Linux";

  let device_type = "Desktop";
  if (u.includes("iphone") || u.includes("ipod") || (u.includes("android") && !u.includes("tablet"))) {
    device_type = "Mobile";
  } else if (u.includes("ipad") || u.includes("tablet")) {
    device_type = "Tablet";
  }

  return { device_type, os };
}

async function getGeo(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: null, city: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === "success") {
      return { country: data.country ?? null, city: data.city ?? null };
    }
  } catch {
    // geo lookup is best-effort
  }
  return { country: null, city: null };
}

export async function POST(req: NextRequest) {
  const { contactId, referrer, visitorId } = await req.json();
  if (!contactId) return NextResponse.json({ ok: false });

  const ua = req.headers.get("user-agent") ?? "";
  const { device_type, os } = parseDevice(ua);

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "");

  const { country, city } = await getGeo(ip);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Server-side returning check — has this visitor_id scanned this contact before?
  let is_returning = false;
  if (visitorId) {
    const { count } = await supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .eq("visitor_id", visitorId);
    is_returning = (count ?? 0) > 0;
  }

  await supabase.from("qr_scans").insert({
    contact_id: contactId,
    device_type,
    os,
    country,
    city,
    referrer: referrer ?? null,
    visitor_id: visitorId ?? null,
    is_returning,
  });

  return NextResponse.json({ ok: true });
}
