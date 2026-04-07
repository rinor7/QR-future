"use client";

import { useEffect, useRef } from "react";
type DotStyle = "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
type CornerStyle = "square" | "dot" | "extra-rounded";

interface Props {
  value: string;
  size?: number;
  dotStyle?: DotStyle;
  cornerStyle?: CornerStyle;
  dotColor?: string;
  bgColor?: string;
  gradient?: boolean;
  gradientColor?: string;
  logoUrl?: string;
  showLogo?: boolean;
}

export default function QRCodeStyled({
  value,
  size = 200,
  dotStyle = "square",
  cornerStyle = "square",
  dotColor = "#000000",
  bgColor = "#ffffff",
  gradient = false,
  gradientColor = "#2563eb",
  logoUrl,
  showLogo = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!value || !ref.current) return;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: "svg",
        data: value,
        dotsOptions: gradient
          ? {
              type: dotStyle as "square",
              gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                  { offset: 0, color: dotColor },
                  { offset: 1, color: gradientColor },
                ],
              },
            }
          : { type: dotStyle as "square", color: dotColor },
        backgroundOptions: {
          color: bgColor,
        },
        cornersSquareOptions: {
          type: cornerStyle as "square",
          color: dotColor,
        },
        cornersDotOptions: {
          type: cornerStyle === "dot" ? "dot" : undefined,
          color: dotColor,
        },
        ...(logoUrl && showLogo
          ? {
              image: logoUrl,
              imageOptions: {
                crossOrigin: "anonymous",
                margin: 4,
                imageSize: 0.3,
              },
            }
          : {}),
        qrOptions: {
          errorCorrectionLevel: "H",
        },
      });

      // Clear previous
      if (ref.current) {
        ref.current.innerHTML = "";
        qr.append(ref.current);
        instanceRef.current = qr;
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size, dotStyle, cornerStyle, dotColor, bgColor, gradient, gradientColor, logoUrl, showLogo]);

  return <div ref={ref} style={{ lineHeight: 0 }} />;
}
