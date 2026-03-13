import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/lib/language";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </LanguageProvider>
  );
}
