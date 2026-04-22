"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import ActivityPanel from "@/components/ActivityPanel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("qr-dark-mode") === "true";
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("qr-dark-mode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  return (
    <>
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
          {/* Activity toggle (mobile) */}
          <button
            onClick={() => setActivityOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {activityCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[#eef1f8] dark:border-[#0f1117]" />
            )}
          </button>
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
            <TopHeader
              onActivityToggle={() => setActivityOpen((v) => !v)}
              activityCount={activityCount}
            />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-auto pt-14 wide:pt-0">
            {children}
          </main>
        </div>
      </div>

      {/* Activity Panel — fixed overlay, outside the flex layout */}
      <ActivityPanel
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        onUnreadChange={setActivityCount}
      />
    </>
  );
}
