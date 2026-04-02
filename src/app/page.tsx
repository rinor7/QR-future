import Link from "next/link";
import { QrCode, Check, Zap, Shield, Globe, ScanLine, Pencil, CreditCard, Layers, BadgeCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import FAQSection from "./FAQSection";
import QRDemoSection from "./QRDemoSection";

const PLAN_ORDER = ["free", "star", "premium", "platinum"];

const PLAN_STYLE: Record<string, { badge: string; border: string; highlight: boolean }> = {
  free:     { badge: "bg-gray-100 text-gray-600",     border: "border-gray-200",   highlight: false },
  star:     { badge: "bg-yellow-100 text-yellow-700", border: "border-yellow-300", highlight: false },
  premium:  { badge: "bg-blue-100 text-blue-700",     border: "border-blue-400",   highlight: true  },
  platinum: { badge: "bg-purple-100 text-purple-700", border: "border-purple-400", highlight: false },
};

const PLAN_CTA: Record<string, string> = {
  free:     "Kostenlos starten",
  star:     "Star wählen",
  premium:  "Premium wählen",
  platinum: "Platinum wählen",
};

const FEATURES = [
  {
    icon: QrCode,
    title: "Digitale Visitenkarten",
    desc: "Erstellen Sie professionelle QR-Codes mit Kontaktdaten, Logo, Social Media und mehr.",
  },
  {
    icon: Globe,
    title: "Überall zugänglich",
    desc: "Ihre QR-Codes sind jederzeit und von überall abrufbar, ohne App-Download.",
  },
  {
    icon: Shield,
    title: "Sicher & zuverlässig",
    desc: "Ihre Daten werden sicher gespeichert und sind nur für Sie verwaltbar.",
  },
];

const USE_CASES = [
  {
    icon: CreditCard,
    label: "Visitenkarte",
    desc: "Drucken Sie Ihren QR-Code auf Ihre Visitenkarte. Ein Scan und alle Infos sind direkt im Handy.",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Layers,
    label: "Flyer & Plakate",
    desc: "Ergänzen Sie Flyer, Plakate oder Broschüren mit Ihrem QR-Code für sofortigen Kontakt.",
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    icon: BadgeCheck,
    label: "Türschild / Eingang",
    desc: "Befestigen Sie einen QR-Code am Eingang. Besucher speichern Ihre Daten direkt beim Ankommen.",
    bg: "bg-green-50",
    iconColor: "text-green-600",
  },
];

async function getStats() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const [{ count: codes }, { count: scans }, { count: users }] = await Promise.all([
      supabase.from("contacts").select("*", { count: "exact", head: true }),
      supabase.from("scans").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);
    return { codes: codes ?? 0, scans: scans ?? 0, users: users ?? 0 };
  } catch {
    return null;
  }
}

async function getPlanConfigs() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase.from("plan_config").select("plan, price, features");
    if (!data) return null;
    return PLAN_ORDER
      .map((p) => data.find((d) => d.plan === p))
      .filter(Boolean) as { plan: string; price: number; features: string[] }[];
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [plans, stats] = await Promise.all([getPlanConfigs(), getStats()]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">QR Plattform</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Anmelden
            </Link>
            <Link href="/register" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)"}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
          {/* Left: text */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3 h-3" /> Digitale Visitenkarten leicht gemacht
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
              Ihr QR-Code.<br />Immer aktuell.
            </h1>
            <p className="text-lg text-blue-100 max-w-lg mb-8">
              Erstellen Sie in Sekunden eine digitale Visitenkarte mit QR-Code. Kontaktdaten, Logo, Social Media. Jederzeit bearbeitbar, ohne neuen Druck.
            </p>
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <Link href="/register" className="w-full sm:w-auto text-center bg-white hover:bg-blue-50 text-blue-700 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors shadow-lg">
                Kostenlos starten
              </Link>
              <Link href="/login" className="w-full sm:w-auto text-center border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors">
                Anmelden
              </Link>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 mt-8 justify-center md:justify-start">
              {["Kein App-Download", "Kostenlos starten", "Jederzeit kündbar"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-blue-100 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-300" />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: mock card visual */}
          <div className="flex-shrink-0 w-full max-w-xs">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Card header */}
              <div className="h-24 bg-gradient-to-br from-indigo-500 to-blue-600" />
              {/* Avatar */}
              <div className="flex flex-col items-center -mt-10 pb-6 px-6">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center mb-3">
                  <QrCode className="w-10 h-10 text-blue-600" />
                </div>
                <p className="font-bold text-gray-900 text-base">Max Muster</p>
                <p className="text-sm text-gray-500">Geschäftsführer · Muster AG</p>
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

      {/* Stats bar — only show when numbers are meaningful */}
      {stats && stats.codes >= 20 && stats.users >= 5 && (
        <section className="border-y border-gray-100 py-10">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.codes.toLocaleString("de-CH")}+</p>
              <p className="text-sm text-gray-500 mt-1">QR-Codes erstellt</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.scans.toLocaleString("de-CH")}+</p>
              <p className="text-sm text-gray-500 mt-1">Scans insgesamt</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.users.toLocaleString("de-CH")}+</p>
              <p className="text-sm text-gray-500 mt-1">Nutzer vertrauen uns</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Warum QR Plattform?</h2>
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
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">So funktioniert&apos;s</h2>
          <p className="text-center text-gray-500 mb-16">In 3 einfachen Schritten zur digitalen Visitenkarte.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gray-200" />
            {[
              {
                icon: QrCode,
                step: "01",
                title: "QR-Code erstellen",
                desc: "Tragen Sie Ihre Kontaktdaten, Logo und Social-Media-Links ein. In wenigen Sekunden ist Ihr QR-Code fertig.",
              },
              {
                icon: ScanLine,
                step: "02",
                title: "Drucken oder teilen",
                desc: "Laden Sie Ihren QR-Code als PNG herunter und drucken ihn auf Visitenkarten, Flyer oder wohin Sie möchten.",
              },
              {
                icon: Pencil,
                step: "03",
                title: "Jederzeit bearbeiten",
                desc: "Ändern Sie Ihre Daten wann immer Sie wollen. Der gedruckte QR-Code leitet immer auf die aktuellen Infos weiter.",
              },
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
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Wo können Sie ihn einsetzen?</h2>
          <p className="text-center text-gray-500 mb-12">Überall dort, wo Sie gefunden werden möchten.</p>
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
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Einfache Preisgestaltung</h2>
          <p className="text-center text-gray-500 mb-12">Starten Sie kostenlos. Upgraden Sie wenn Sie bereit sind.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(plans ?? []).map((plan) => {
              const style = PLAN_STYLE[plan.plan] ?? PLAN_STYLE.free;
              const planName = plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1);
              return (
                <div
                  key={plan.plan}
                  className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${style.border} ${style.highlight ? "ring-2 ring-blue-500 shadow-lg" : ""}`}
                >
                  {style.highlight && (
                    <div className="text-center mb-3">
                      <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">Beliebteste</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{planName}</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">CHF {plan.price}</span>
                    <span className="text-gray-400 text-sm">/Monat</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.length > 0 ? plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    )) : (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Kein Ablauf
                      </li>
                    )}
                  </ul>
                  <Link
                    href="/register"
                    className={`w-full text-center py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      style.highlight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {PLAN_CTA[plan.plan] ?? `${planName} wählen`}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div id="faq"><FAQSection /></div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-white text-base">QR Plattform</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Digitale Visitenkarten mit QR-Code. Einmal erstellen, jederzeit aktualisieren. Kein Neudruck nötig.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Plattform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/register" className="hover:text-white transition-colors">Kostenlos starten</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Anmelden</Link></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Preise</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Jetzt starten</h4>
            <p className="text-sm text-gray-500 mb-4">Erstellen Sie Ihren ersten QR-Code kostenlos, in weniger als 2 Minuten.</p>
            <Link
              href="/register"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Kostenlos registrieren
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <span>© {new Date().getFullYear()} QR Plattform. Alle Rechte vorbehalten.</span>
            <span>Made in Switzerland 🇨🇭</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
