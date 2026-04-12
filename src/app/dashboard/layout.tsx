"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { LanguageProvider } from "@/lib/language";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("qr-dark-mode") === "true";
    setDarkMode(saved);
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("qr-dark-mode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-[#eef1f8] dark:bg-[#0f1117]">
        {/* Mobile top bar */}
        <div className="wide:hidden fixed top-0 left-0 right-0 h-14 bg-[#eef1f8] dark:bg-[#0f1117] flex items-center px-4 z-30 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex-1 font-bold text-slate-900 dark:text-slate-100" id="mobile-brand-name">QR Orchestrator</span>
          <button
            onClick={toggleDark}
            title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {darkMode ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="wide:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main column: header + content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header bar (desktop only) */}
          <div className="hidden wide:block">
            <TopHeader />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-auto pt-14 wide:pt-0">
            {children}
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
