export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getContact } from "@/lib/store";
import QRLandingClient from "./QRLandingClient";

export default async function QRLandingPage({ params }: { params: { id: string } }) {
  const contact = await getContact(params.id);

  if (!contact) notFound();
  if (!contact.isActive) redirect("https://qr-card.ch");

  // Check global lead capture disable flag (only if per-QR is enabled, to avoid extra DB call)
  let leadCaptureActive = contact.leadCaptureEnabled;
  if (leadCaptureActive) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: contactRow } = await supabase
      .from("contacts")
      .select("user_id")
      .eq("id", contact.id)
      .single();
    if (contactRow) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("lead_capture_disabled")
        .eq("user_id", contactRow.user_id)
        .single();
      if (profile?.lead_capture_disabled) leadCaptureActive = false;
    }
  }

  return <QRLandingClient contact={contact} leadCaptureActive={leadCaptureActive} />;
}
