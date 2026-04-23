"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/lib/language";

export default function FAQSection() {
  const { tr } = useLang();
  const [open, setOpen] = useState<number | null>(null);

  const FAQS = [
    { q: tr.home_faq1_q, a: tr.home_faq1_a },
    { q: tr.home_faq2_q, a: tr.home_faq2_a },
    { q: tr.home_faq3_q, a: tr.home_faq3_a },
    { q: tr.home_faq4_q, a: tr.home_faq4_a },
    { q: tr.home_faq5_q, a: tr.home_faq5_a },
    { q: tr.home_faq6_q, a: tr.home_faq6_a },
    { q: tr.home_faq7_q, a: tr.home_faq7_a },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{tr.home_faq_title}</h2>
        <p className="text-center text-gray-500 mb-12">{tr.home_faq_sub}</p>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
