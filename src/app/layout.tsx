import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Platform",
  description: "QR Code Management Platform",
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
