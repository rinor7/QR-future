import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Plattform",
  description: "QR-Code-Verwaltungsplattform für digitale Visitenkarten und mehr.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
