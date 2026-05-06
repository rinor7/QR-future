import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { limiters, rateLimit, getIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(limiters.interaction, getIp(req));
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { contactId, eventType, visitorId } = await req.json();
  if (!contactId || !eventType) return NextResponse.json({ ok: false });
  if (!UUID_RE.test(contactId)) return NextResponse.json({ error: "Invalid contactId" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("id", contactId);
  if (!count) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await supabase.from("qr_interactions").insert({
    contact_id: contactId,
    event_type: eventType,
    visitor_id: visitorId ?? null,
  });

  return NextResponse.json({ ok: true });
}
