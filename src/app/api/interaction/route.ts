import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { limiters, rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(limiters.interaction, getIp(req));
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { contactId, eventType, visitorId } = await req.json();
  if (!contactId || !eventType) return NextResponse.json({ ok: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("qr_interactions").insert({
    contact_id: contactId,
    event_type: eventType,
    visitor_id: visitorId ?? null,
  });

  return NextResponse.json({ ok: true });
}
