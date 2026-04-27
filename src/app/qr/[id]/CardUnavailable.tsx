import Link from "next/link";
import { headers } from "next/headers";

const HOMEPAGE_URL = "https://qr-card.ch";

export default function CardUnavailable() {
  const acceptLang = headers().get("accept-language") ?? "";
  const isGerman = /^de\b/i.test(acceptLang) || /\bde[-_]/i.test(acceptLang);

  const t = isGerman
    ? {
        title: "Diese Karte ist nicht mehr verfügbar",
        subtitle: "Der Inhaber hat diese digitale Visitenkarte deaktiviert oder gelöscht.",
        cta: "Zur Startseite",
      }
    : {
        title: "This card is no longer available",
        subtitle: "The owner has disabled or removed this digital business card.",
        cta: "Go to homepage",
      };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-gray-400"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{t.title}</h1>
        <p className="text-sm text-gray-500 mb-6">{t.subtitle}</p>
        <Link
          href={HOMEPAGE_URL}
          className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          {t.cta}
        </Link>
      </div>
    </main>
  );
}
