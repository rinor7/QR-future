export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getContact } from "@/lib/store";
import { t } from "@/lib/language";
import QRLandingClient from "./QRLandingClient";

export default async function QRLandingPage({
  params,
}: {
  params: { id: string };
}) {
  const contact = await getContact(params.id);

  if (!contact) {
    notFound();
  }

  if (!contact.isActive) {
    const acceptLang = headers().get("accept-language") ?? "";
    const tr = acceptLang.toLowerCase().startsWith("de") ? t.de : t.en;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f1f5f9" }}>
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl">⏸</div>
          <h1 className="text-xl font-bold text-gray-900">{tr.qr_paused_title}</h1>
          <p className="text-sm text-gray-500">{tr.qr_paused_body}</p>
        </div>
      </div>
    );
  }

  return <QRLandingClient contact={contact} />;
}
