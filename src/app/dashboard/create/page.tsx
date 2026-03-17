"use client";

import { useRouter } from "next/navigation";
import QRForm from "@/components/QRForm";
import { createContact } from "@/lib/store";
import { CreateQRContact, PLAN_LABELS } from "@/lib/types";
import { useState } from "react";
import { useLang } from "@/lib/language";

export default function CreatePage() {
  const router = useRouter();
  const { tr } = useLang();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateQRContact) {
    setError(null);
    try {
      const contact = await createContact(data);
      router.push(`/dashboard/edit/${contact.id}?created=1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("PLAN_LIMIT:")) {
        const [, plan, limit] = msg.split(":");
        const planLabel = PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan;
        setError(
          `${tr.plan_limit_reached} ${planLabel} — ${limit} QR Codes. ${tr.plan_upgrade_hint}`
        );
      } else {
        setError(tr.create_error);
        console.error(e);
      }
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
