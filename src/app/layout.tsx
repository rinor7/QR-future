import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language";
import { BRAND_NAME } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "QR-Code-Verwaltungsplattform für digitale Visitenkarten und mehr.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        {/* Apply dark mode class before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(location.pathname.startsWith('/dashboard')&&localStorage.getItem('qr-dark-mode')==='true'){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
