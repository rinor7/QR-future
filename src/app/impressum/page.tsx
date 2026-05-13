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
        <h1 className="text-4xl font-bold mb-12">{tr.impressum_title}</h1>

        <div className="space-y-10 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_operator_heading}</h2>
            <p className="font-semibold text-gray-900">{tr.impressum_operator_name}</p>
            <p>{tr.impressum_operator_street}</p>
            <p>{tr.impressum_operator_city}</p>
            <p>{tr.impressum_operator_country}</p>
            <p className="mt-3">
              {tr.impressum_operator_email_label}{" "}
              <a href={`mailto:${tr.impressum_operator_email_value}`} className="text-blue-600 hover:underline">{tr.impressum_operator_email_value}</a>
            </p>
            <p>
              {tr.impressum_operator_website_label}{" "}
              <a href={`https://${tr.impressum_operator_website_value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{tr.impressum_operator_website_value}</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_company_heading}</h2>
            <dl className="space-y-1.5">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_company_name_label}</dt>
                <dd>{tr.impressum_company_name_value}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_legal_form_label}</dt>
                <dd>{tr.impressum_legal_form_value}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_sitz_label}</dt>
                <dd>{tr.impressum_sitz_value}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_register_label}</dt>
                <dd>{tr.impressum_register_value}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-gray-500">{tr.impressum_uid_label}</dt>
                <dd>{tr.impressum_uid_value}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_representatives_heading}</h2>
            <p>{tr.impressum_representatives_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_platform_heading}</h2>
            <p>{tr.impressum_platform_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_content_responsibility_heading}</h2>
            <p className="mb-3">{tr.impressum_content_responsibility_body_1}</p>
            <p>{tr.impressum_content_responsibility_body_2}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_user_content_heading}</h2>
            <p className="mb-3">{tr.impressum_user_content_body_1}</p>
            <p>{tr.impressum_user_content_body_2}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_disclaimer_heading}</h2>
            <p className="mb-3">{tr.impressum_disclaimer_body_1}</p>
            <p>{tr.impressum_disclaimer_body_2}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_external_links_heading}</h2>
            <p className="mb-3">{tr.impressum_external_links_body_1}</p>
            <p>{tr.impressum_external_links_body_2}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_copyright_heading}</h2>
            <p className="mb-3">{tr.impressum_copyright_body_1}</p>
            <p>{tr.impressum_copyright_body_2}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_trademarks_heading}</h2>
            <p>{tr.impressum_trademarks_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_law_heading}</h2>
            <p className="mb-3">{tr.impressum_law_body_1}</p>
            <p>{tr.impressum_law_body_2}</p>
          </section>

          <section className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.impressum_privacy_heading}</h2>
            <p>
              {tr.impressum_privacy_body}{" "}
              <Link href="/datenschutz" className="text-blue-600 hover:underline font-medium">{tr.impressum_privacy_link}</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
