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
  if (u.includes("iphone") || u.includes("ipod") || (u.includes("android") && !u.includes("tablet"))) device_type = "Mobile";
  else if (u.includes("ipad") || u.includes("tablet")) device_type = "Tablet";
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
    if (data.status === "success") return { country: data.country ?? null, city: data.city ?? null };
  } catch {
    // best-effort
  }
  return { country: null, city: null };
}

export async function POST(req: NextRequest) {
  const { contactId, visitorId, name, email, comment, consent } = await req.json();

  if (!contactId || !name || !email || !consent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const { device_type, os } = parseDevice(ua);
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "");
  const { country, city } = await getGeo(ip);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify lead capture is still enabled for this QR (guard against race conditions)
  const { data: contact } = await supabase
    .from("contacts")
    .select("lead_capture_enabled, user_id")
    .eq("id", contactId)
    .single();

  if (!contact?.lead_capture_enabled) {
    return NextResponse.json({ error: "Lead capture not enabled" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("qr_leads").insert({
    contact_id: contactId,
    visitor_id: visitorId ?? null,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    comment: comment?.trim() || null,
    consent: true,
    consented_at: now,
    country,
    city,
    device_type,
    os,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire webhook if configured (non-blocking)
  const { data: webhookProfile } = await supabase
    .from("profiles")
    .select("lead_webhook_url")
    .eq("user_id", contact.user_id)
    .single();

  if (webhookProfile?.lead_webhook_url) {
    // Fetch QR label for the payload
    const { data: qrContact } = await supabase
      .from("contacts")
      .select("name, company, qr_label")
      .eq("id", contactId)
      .single();

    const payload = {
      event: "lead.captured",
      timestamp: now,
      lead: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        comment: comment?.trim() || null,
      },
      source: {
        contact_id: contactId,
        qr_label: qrContact?.qr_label || null,
        employee: qrContact?.name || qrContact?.company || null,
      },
    };

    try {
      await fetch(webhookProfile.lead_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Webhook failure must not block the response
    }
  }

  return NextResponse.json({ ok: true });
}
