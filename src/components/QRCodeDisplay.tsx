"use client";

import QRCode from "react-qr-code";

export default function QRCodeDisplay({
  value,
  size = 200,
  logoUrl,
}: {
  value: string;
  size?: number;
  logoUrl?: string;
}) {
  if (!value) return null;

  const logoSize = Math.round(size * 0.32);

  return (
    <div className="relative inline-block">
      <QRCode
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#1e3a8a"
        level="H"
      />
      {logoUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              width: logoSize,
              height: logoSize,
              objectFit: "contain",
              background: "#fff",
              padding: Math.round(logoSize * 0.1),
              borderRadius: 4,
            }}
          />
        </div>
      )}
    </div>
  );
}
