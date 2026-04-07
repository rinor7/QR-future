"use client";

import QRCodeStyled from "./QRCodeStyled";

interface Props {
  value: string;
  size?: number;
  logoUrl?: string;
  showLogo?: boolean;
  dotStyle?: "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
  cornerStyle?: "square" | "dot" | "extra-rounded";
  dotColor?: string;
  bgColor?: string;
  gradient?: boolean;
  gradientColor?: string;
}

export default function QRCodeDisplay({
  value,
  size = 200,
  logoUrl,
  showLogo = true,
  dotStyle = "square",
  cornerStyle = "square",
  dotColor = "#000000",
  bgColor = "#ffffff",
  gradient = false,
  gradientColor = "#2563eb",
}: Props) {
  if (!value) return null;

  return (
    <QRCodeStyled
      value={value}
      size={size}
      dotStyle={dotStyle}
      cornerStyle={cornerStyle}
      dotColor={dotColor}
      bgColor={bgColor}
      gradient={gradient}
      gradientColor={gradientColor}
      logoUrl={logoUrl}
      showLogo={showLogo}
    />
  );
}
