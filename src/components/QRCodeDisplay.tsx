"use client";

import QRCode from "react-qr-code";

export default function QRCodeDisplay({
  value,
  size = 200,
}: {
  value: string;
  size?: number;
}) {
  if (!value) return null;
  return (
    <QRCode
      value={value}
      size={size}
      bgColor="#ffffff"
      fgColor="#1e3a8a"
      level="M"
    />
  );
}
