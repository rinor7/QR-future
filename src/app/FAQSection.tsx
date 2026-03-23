"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Was ist ein dynamischer QR-Code?",
    a: "Ein dynamischer QR-Code leitet auf eine URL weiter, die Sie jederzeit ändern können — ohne den gedruckten QR-Code zu ersetzen. Ihre Kunden scannen immer die aktuellsten Daten.",
  },
  {
    q: "Kann ich meinen QR-Code nach dem Drucken noch bearbeiten?",
    a: "Ja! Das ist der grösste Vorteil unserer Plattform. Sie können Name, Kontaktdaten, Logo, Social-Media-Links und mehr jederzeit aktualisieren. Der QR-Code selbst bleibt unverändert.",
  },
  {
    q: "Brauchen meine Kunden eine App zum Scannen?",
    a: "Nein. Jedes moderne Smartphone kann QR-Codes direkt mit der Kamera-App scannen — ganz ohne App-Download.",
  },
  {
    q: "Wie lade ich meinen QR-Code herunter?",
    a: "Nach dem Erstellen können Sie Ihren QR-Code als PNG-Datei herunterladen und direkt auf Visitenkarten, Flyer oder Ihr Material drucken.",
  },
  {
    q: "Kann ich sehen, wie oft mein QR-Code gescannt wurde?",
    a: "Ja. Im Dashboard sehen Sie für jeden QR-Code die Scan-Statistiken — wann und wie oft gescannt wurde.",
  },
  {
    q: "Was passiert, wenn ich mein Abo kündige?",
    a: "Ihre QR-Codes bleiben aktiv. Sie können jedoch keine neuen Codes mehr erstellen und haben keinen Zugriff auf Premium-Funktionen, bis Sie wieder upgraden.",
  },
  {
    q: "Kann ich mein eigenes Logo im QR-Code einbetten?",
    a: "Ja. Ab dem Star-Plan können Sie Ihr Logo in die Mitte des QR-Codes einbetten — für einen professionellen, markentreuen Auftritt.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Häufige Fragen</h2>
        <p className="text-center text-gray-500 mb-12">Alles was Sie wissen müssen — kurz und klar.</p>
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
