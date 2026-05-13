"use client";

import Link from "next/link";
import { QrCode, ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/language";
import { BRAND_NAME } from "@/lib/brand";

export default function DatenschutzPage() {
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
            {tr.privacy_back}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">{tr.privacy_title}</h1>
        <p className="text-gray-500 mb-2">{tr.privacy_subtitle}</p>
        <p className="text-xs text-gray-400 mb-12">
          {tr.privacy_updated_label} {tr.privacy_updated_value}
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_intro_heading}</h2>
            <p>{tr.privacy_intro_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_controller_heading}</h2>
            <p className="mb-2">{tr.privacy_controller_body}</p>
            <p className="font-mono text-xs bg-gray-50 border border-gray-100 rounded-lg p-3">{tr.privacy_controller_placeholder}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_scope_heading}</h2>
            <p>{tr.privacy_scope_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_categories_heading}</h2>
            <p className="mb-4">{tr.privacy_categories_intro}</p>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_account_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_account_body}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_content_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_content_body}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_analytics_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_analytics_body}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_leads_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_leads_body}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_billing_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_billing_body}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900">{tr.privacy_cat_technical_title}</dt>
                <dd className="mt-1">{tr.privacy_cat_technical_body}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_purposes_heading}</h2>
            <p className="mb-3">{tr.privacy_purposes_intro}</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{tr.privacy_purpose_1}</li>
              <li>{tr.privacy_purpose_2}</li>
              <li>{tr.privacy_purpose_3}</li>
              <li>{tr.privacy_purpose_4}</li>
              <li>{tr.privacy_purpose_5}</li>
              <li>{tr.privacy_purpose_6}</li>
              <li>{tr.privacy_purpose_7}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_legal_basis_heading}</h2>
            <p>{tr.privacy_legal_basis_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_recipients_heading}</h2>
            <p className="mb-3">{tr.privacy_recipients_intro}</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{tr.privacy_recipient_supabase}</li>
              <li>{tr.privacy_recipient_vercel}</li>
              <li>{tr.privacy_recipient_stripe}</li>
              <li>{tr.privacy_recipient_email}</li>
            </ul>
            <p className="mt-4">{tr.privacy_recipients_authorities}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_transfers_heading}</h2>
            <p>{tr.privacy_transfers_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_cookies_heading}</h2>
            <p>{tr.privacy_cookies_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_retention_heading}</h2>
            <p>{tr.privacy_retention_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_rights_heading}</h2>
            <p className="mb-3">{tr.privacy_rights_intro}</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>{tr.privacy_right_access}</li>
              <li>{tr.privacy_right_rectify}</li>
              <li>{tr.privacy_right_delete}</li>
              <li>{tr.privacy_right_restrict}</li>
              <li>{tr.privacy_right_portability}</li>
              <li>{tr.privacy_right_object}</li>
            </ul>
            <p className="mt-4">{tr.privacy_rights_contact}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_complaint_heading}</h2>
            <p>{tr.privacy_complaint_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_security_heading}</h2>
            <p>{tr.privacy_security_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_children_heading}</h2>
            <p>{tr.privacy_children_body}</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_changes_heading}</h2>
            <p>{tr.privacy_changes_body}</p>
          </section>

          <section className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tr.privacy_contact_heading}</h2>
            <p className="mb-2">{tr.privacy_contact_body}</p>
            <p className="font-mono text-xs bg-gray-50 border border-gray-100 rounded-lg p-3">{tr.privacy_contact_placeholder}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
