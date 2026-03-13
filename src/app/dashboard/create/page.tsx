"use client";

import { useRouter } from "next/navigation";
import QRForm from "@/components/QRForm";
import { createContact } from "@/lib/store";
import { CreateQRContact } from "@/lib/types";
import { useState } from "react";
import { useLang } from "@/lib/language";

export default function CreatePage() {
  const router = useRouter();
  const { tr } = useLang();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateQRContact) {
    try {
      const contact = await createContact(data);
      router.push(`/dashboard/edit/${contact.id}?created=1`);
    } catch (e) {
      setError(tr.create_error);
      console.error(e);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.create_title}</h1>
        <p className="text-gray-500 mt-1">{tr.create_subtitle}</p>
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}
      <QRForm onSubmit={handleSubmit} submitLabel={tr.create_submit} />
    </div>
  );
}
