import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

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
  title: "QR Plattform",
  description: "QR-Code-Verwaltungsplattform für digitale Visitenkarten und mehr.",
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('qr-dark-mode')==='true'){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
