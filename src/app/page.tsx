import Link from "next/link";
import { QrCode, Check, Zap, Shield, Globe } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

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
    desc: "Ihre QR-Codes sind jederzeit und von überall abrufbar — kein App-Download nötig.",
  },
  {
    icon: Shield,
    title: "Sicher & zuverlässig",
    desc: "Ihre Daten werden sicher gespeichert und sind nur für Sie verwaltbar.",
  },
];

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
  const plans = await getPlanConfigs();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">QR Plattform</span>
          </div>
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
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3 h-3" /> Digitale Visitenkarten leicht gemacht
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          QR Codes für Ihre<br />professionelle Angaben
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Erstellen Sie in Sekunden digitale Visitenkarten mit QR-Code. Teilen Sie Kontaktdaten, Website, Social Media und mehr — ohne App.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-colors">
            Kostenlos starten
          </Link>
          <Link href="/login" className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors">
            Anmelden
          </Link>
        </div>
      </section>

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

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Einfache Preisgestaltung</h2>
          <p className="text-center text-gray-500 mb-12">Starten Sie kostenlos — upgraden Sie wenn Sie bereit sind.</p>
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

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            QR Plattform
          </div>
          <span>© {new Date().getFullYear()} QR Plattform. Alle Rechte vorbehalten.</span>
        </div>
      </footer>
    </div>
  );
}
