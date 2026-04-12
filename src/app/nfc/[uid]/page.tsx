export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default async function NFCRedirect({ params }: { params: { uid: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up the card by UID (case-insensitive)
  const { data: card } = await supabase
    .from("nfc_cards")
    .select("contact_id")
    .ilike("card_uid", params.uid)
    .single();

  if (!card) notFound();

  if (!card.contact_id) {
    // Card registered but not assigned — show a simple message
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📡</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Card not assigned</h1>
          <p className="text-gray-500 text-sm">This NFC card hasn&apos;t been linked to a profile yet.</p>
        </div>
      </div>
    );
  }

  // Redirect to the contact's QR landing page
  redirect(`/qr/${card.contact_id}`);
}
