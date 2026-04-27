"use client";

import Link from "next/link";
import { QrCode, Check, Zap, Shield, Globe, ScanLine, Pencil, CreditCard, Layers, BadgeCheck } from "lucide-react";
import FAQSection from "./FAQSection";
import QRDemoSection from "./QRDemoSection";
import { useLang } from "@/lib/language";

const PLAN_ORDER = ["free", "star", "premium", "platinum"];

const PLAN_STYLE: Record<string, { badge: string; border: string; highlight: boolean }> = {
  free:     { badge: "bg-gray-100 text-gray-600",     border: "border-gray-200",   highlight: false },
  star:     { badge: "bg-yellow-100 text-yellow-700", border: "border-yellow-300", highlight: false },
  premium:  { badge: "bg-blue-100 text-blue-700",     border: "border-blue-400",   highlight: true  },
  platinum: { badge: "bg-purple-100 text-purple-700", border: "border-purple-400", highlight: false },
};

export default function LandingClient({
  plans,
  stats,
}: {
  plans: { plan: string; price: number; features: string[]; features_en: string[] }[] | null;
  stats: { codes: number; scans: number; users: number } | null;
}) {
  const { lang, tr, toggleLang } = useLang();

  const PLAN_CTA: Record<string, string> = {
    free:     tr.home_cta_free,
    star:     tr.home_cta_star,
    premium:  tr.home_cta_premium,
    platinum: tr.home_cta_platinum,
  };

  const FEATURES = [
    { icon: QrCode, title: tr.home_feat1_title, desc: tr.home_feat1_desc },
    { icon: Globe,  title: tr.home_feat2_title, desc: tr.home_feat2_desc },
    { icon: Shield, title: tr.home_feat3_title, desc: tr.home_feat3_desc },
  ];

  const USE_CASES = [
    { icon: CreditCard, label: tr.home_use1_title, desc: tr.home_use1_desc, bg: "bg-blue-50",   iconColor: "text-blue-600" },
    { icon: Layers,     label: tr.home_use2_title, desc: tr.home_use2_desc, bg: "bg-purple-50", iconColor: "text-purple-600" },
    { icon: BadgeCheck, label: tr.home_use3_title, desc: tr.home_use3_desc, bg: "bg-green-50",  iconColor: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:inline">QR Plattform</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={toggleLang}
              title={lang === "de" ? "Switch to English" : "Zu Deutsch wechseln"}
              className="h-9 px-2 sm:px-3 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold tracking-wide"
            >
              {lang === "de" ? "DE" : "EN"}
            </button>
            <Link href="/login" className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-2">
              {tr.home_signin}
            </Link>
            <Link href="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              {tr.home_start_free}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)"}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3 h-3" /> {tr.home_eyebrow}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
              {tr.home_hero_h1_a}<br />{tr.home_hero_h1_b}
            </h1>
            <p className="text-lg text-blue-100 max-w-lg mb-8">
              {tr.home_hero_sub}
            </p>
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <Link href="/register" className="w-full sm:w-auto text-center bg-white hover:bg-blue-50 text-blue-700 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors shadow-lg">
                {tr.home_start_free}
              </Link>
              <Link href="/login" className="w-full sm:w-auto text-center border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors">
                {tr.home_signin}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-8 justify-center md:justify-start">
              {[tr.home_trust_no_app, tr.home_trust_free, tr.home_trust_cancel].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-blue-100 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-300" />{t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 w-full max-w-xs">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-indigo-500 to-blue-600" />
              <div className="flex flex-col items-center -mt-10 pb-6 px-6">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center mb-3">
                  <QrCode className="w-10 h-10 text-blue-600" />
                </div>
                <p className="font-bold text-gray-900 text-base">Max Muster</p>
                <p className="text-sm text-gray-500">{tr.home_card_role}</p>
                <div className="w-full mt-5 space-y-2">
                  {["+41 79 000 00 00", "max@muster.ch", "www.muster.ch"].map((line) => (
                    <div key={line} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs text-gray-600 truncate">{line}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 p-3 bg-gray-50 rounded-2xl">
                  <QrCode className="w-20 h-20 text-gray-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && stats.codes >= 20 && stats.users >= 5 && (
        <section className="border-y border-gray-100 py-10">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.codes.toLocaleString(lang === "de" ? "de-CH" : "en-US")}+</p>
              <p className="text-sm text-gray-500 mt-1">{tr.home_stats_codes}</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.scans.toLocaleString(lang === "de" ? "de-CH" : "en-US")}+</p>
              <p className="text-sm text-gray-500 mt-1">{tr.home_stats_scans}</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.users.toLocaleString(lang === "de" ? "de-CH" : "en-US")}+</p>
              <p className="text-sm text-gray-500 mt-1">{tr.home_stats_users}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{tr.home_features_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{tr.home_how_title}</h2>
          <p className="text-center text-gray-500 mb-16">{tr.home_how_sub}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gray-200" />
            {[
              { icon: QrCode,    step: "01", title: tr.home_step1_title, desc: tr.home_step1_desc },
              { icon: ScanLine,  step: "02", title: tr.home_step2_title, desc: tr.home_step2_desc },
              { icon: Pencil,    step: "03", title: tr.home_step3_title, desc: tr.home_step3_desc },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-blue-600 rounded-full text-[10px] font-bold text-blue-600 flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live QR Demo */}
      <QRDemoSection />

      {/* Use cases */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{tr.home_use_title}</h2>
          <p className="text-center text-gray-500 mb-12">{tr.home_use_sub}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map(({ icon: Icon, label, desc, bg, iconColor }) => (
              <div key={label} className="rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{tr.home_pricing_title}</h2>
          <p className="text-center text-gray-500 mb-12">{tr.home_pricing_sub}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(plans ?? []).filter((p) => PLAN_ORDER.includes(p.plan)).map((plan) => {
              const style = PLAN_STYLE[plan.plan] ?? PLAN_STYLE.free;
              const planName = plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1);
              return (
                <div
                  key={plan.plan}
                  className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${style.border} ${style.highlight ? "ring-2 ring-blue-500 shadow-lg" : ""}`}
                >
                  {style.highlight && (
                    <div className="text-center mb-3">
                      <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">{tr.home_pricing_popular}</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{planName}</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">CHF {plan.price}</span>
                    <span className="text-gray-400 text-sm">{tr.home_pricing_per_month}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {(() => {
                      const localized = lang === "en" ? (plan.features_en?.length ? plan.features_en : plan.features) : (plan.features?.length ? plan.features : plan.features_en);
                      if (!localized || localized.length === 0) {
                        return (
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {tr.home_pricing_no_expiry}
                          </li>
                        );
                      }
                      return localized.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ));
                    })()}
                  </ul>
                  <Link
                    href="/register"
                    className={`w-full text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      style.highlight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {PLAN_CTA[plan.plan] ?? `${planName} ${tr.home_cta_select_suffix}`}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div id="faq" className="scroll-mt-20"><FAQSection /></div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-white text-base">QR Plattform</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              {tr.home_footer_about}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{tr.home_footer_platform}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#pricing" className="hover:text-white transition-colors">{tr.home_footer_pricing}</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">{tr.home_footer_faq}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{tr.home_footer_start}</h4>
            <p className="text-sm text-gray-500 mb-4">{tr.home_footer_start_desc}</p>
            <Link
              href="/register"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              {tr.home_footer_register}
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <span>© {new Date().getFullYear()} QR Plattform. {tr.home_footer_rights}</span>
            <span>{tr.home_footer_made_in}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
