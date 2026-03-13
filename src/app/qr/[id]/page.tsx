export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getContact } from "@/lib/store";
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

  return <QRLandingClient contact={contact} />;
}
