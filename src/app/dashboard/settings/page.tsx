"use client";

import { useLang } from "@/lib/language";

export default function SettingsPage() {
  const { tr } = useLang();
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tr.settings_title}</h1>
        <p className="text-gray-500 mt-1">{tr.settings_subtitle}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
        <p className="text-gray-500 text-sm">{tr.settings_placeholder}</p>
      </div>
    </div>
  );
}
