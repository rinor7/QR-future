"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { LanguageProvider } from "@/lib/language";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-surface">
        {/* Mobile top bar */}
        <div className="wide:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-bold text-gray-900" id="mobile-brand-name">QR Orchestrator</span>
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
