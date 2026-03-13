"use client";

import { useRouter } from "next/navigation";
import QRForm from "@/components/QRForm";
import { createContact } from "@/lib/store";
import { CreateQRContact } from "@/lib/types";
import { useState } from "react";

export default function CreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateQRContact) {
    try {
      const contact = await createContact(data);
      router.push(`/dashboard/edit/${contact.id}?created=1`);
    } catch (e) {
      setError("Fehler beim Erstellen. Bitte versuchen Sie es erneut.");
      console.error(e);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Neuer QR Code</h1>
        <p className="text-gray-500 mt-1">Füllen Sie die Felder aus und erstellen Sie Ihren QR Code</p>
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}
      <QRForm onSubmit={handleSubmit} submitLabel="QR Code erstellen" />
    </div>
  );
}
