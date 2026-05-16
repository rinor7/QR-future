import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { limiters, rateLimit } from "@/lib/rate-limit";
import { getGeoFromHeaders } from "@/lib/geo";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "");

  const { ok } = await rateLimit(limiters.scan, ip || "unknown");
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { contactId, referrer, visitorId, source } = await req.json();
  if (!contactId) return NextResponse.json({ ok: false });
  if (!UUID_RE.test(contactId)) return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });
  const scanSource = source === "nfc" ? "nfc" : "qr";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count: contactExists } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("id", contactId);
  if (!contactExists) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const ua = req.headers.get("user-agent") ?? "";
  const { device_type, os } = parseDevice(ua);

  const { country, city } = getGeoFromHeaders(req);

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
    source: scanSource,
  });

  return NextResponse.json({ ok: true });
}
