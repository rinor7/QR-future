"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { useLang } from "@/lib/language";

export default function QRDemoSection() {
  const { tr } = useLang();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const demoUrl = `https://qr-card.ch/demo?name=${encodeURIComponent(name || "Max Muster")}&company=${encodeURIComponent(company || "Muster AG")}`;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{tr.home_demo_title}</h2>
        <p className="text-center text-gray-500 mb-12">{tr.home_demo_sub}</p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.home_demo_name}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Muster"
                maxLength={50}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{tr.home_demo_company}</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Muster AG"
                maxLength={50}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 bg-white"
              />
            </div>
            <a
              href="/register"
              className="mt-2 w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              {tr.home_demo_create}
            </a>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <QRCode
                value={demoUrl}
                size={160}
                fgColor="#1d4ed8"
                bgColor="#ffffff"
                style={{ borderRadius: 8 }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center max-w-[180px]">
              {name || "Max Muster"} · {company || "Muster AG"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
