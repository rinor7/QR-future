import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { contactId, visitorId, name, email, comment, consent } = await req.json();

  if (!contactId || !name || !email || !consent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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

  // Check global org-level disable
  const { data: profile } = await supabase
    .from("profiles")
    .select("lead_capture_disabled")
    .eq("user_id", contact.user_id)
    .single();

  if (profile?.lead_capture_disabled) {
    return NextResponse.json({ error: "Lead capture disabled" }, { status: 403 });
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
