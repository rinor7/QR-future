"use client";

import Link from "next/link";
import { QrCode, ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/language";
import { BRAND_NAME } from "@/lib/brand";

export default function ImpressumPage() {
  const { tr } = useLang();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:inline">{BRAND_NAME}</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {tr.impressum_back}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">{tr.impressum_title}</h1>
        <p className="text-gray-500 mb-12">{tr.impressum_subtitle}</p>

        <div className="space-y-10 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_company_heading}</h2>
            <dl className="space-y-1.5">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_company_name_label}</dt>
                <dd>{tr.impressum_company_name_placeholder}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_legal_form_label}</dt>
                <dd>{tr.impressum_legal_form_placeholder}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_address_heading}</h2>
            <p>{tr.impressum_address_placeholder}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_contact_heading}</h2>
            <dl className="space-y-1.5">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_contact_email_label}</dt>
                <dd>{tr.impressum_contact_email_placeholder}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_contact_phone_label}</dt>
                <dd>{tr.impressum_contact_phone_placeholder}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_register_heading}</h2>
            <dl className="space-y-1.5">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_uid_label}</dt>
                <dd>{tr.impressum_uid_placeholder}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_vat_label}</dt>
                <dd>{tr.impressum_vat_placeholder}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_register_court_label}</dt>
                <dd>{tr.impressum_register_court_placeholder}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_authority_heading}</h2>
            <p>{tr.impressum_authority_placeholder}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_responsible_heading}</h2>
            <p>{tr.impressum_responsible_placeholder}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_disclaimer_heading}</h2>
            <p>{tr.impressum_disclaimer_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_copyright_heading}</h2>
            <p>{tr.impressum_copyright_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_privacy_heading}</h2>
            <p>{tr.impressum_privacy_body}</p>
          </section>

          <section className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_provider_heading}</h2>
            <p>
              {tr.impressum_provider_body}{" "}
              <a href="https://puzzle-enterprise.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                Puzzle Enterprise
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
