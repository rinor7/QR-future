import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ ok: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("qr_scans").insert({ contact_id: contactId });
  return NextResponse.json({ ok: true });
}
