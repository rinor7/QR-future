"use client";

import QRCodeStyled from "./QRCodeStyled";

type DotStyle = "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
type CornerStyle = "square" | "dot" | "extra-rounded";

interface QRStyle {
  qrDotStyle: DotStyle;
  qrCornerStyle: CornerStyle;
  qrDotColor: string;
  qrBgColor: string;
  qrGradient: boolean;
  qrGradientColor: string;
}

interface Props {
  value: QRStyle;
  onChange: (v: QRStyle) => void;
  previewValue?: string;
  logoUrl?: string;
  showLogo?: boolean;
}

const DOT_STYLES: { key: DotStyle; label: string }[] = [
  { key: "square", label: "Square" },
  { key: "dots", label: "Dots" },
  { key: "rounded", label: "Rounded" },
  { key: "classy", label: "Classy" },
  { key: "classy-rounded", label: "Classy Round" },
  { key: "extra-rounded", label: "Extra Round" },
];

const CORNER_STYLES: { key: CornerStyle; label: string }[] = [
  { key: "square", label: "Square" },
  { key: "dot", label: "Dot" },
  { key: "extra-rounded", label: "Rounded" },
];

const PRESET_COLORS = [
  "#000000", "#1e3a8a", "#2563eb", "#7c3aed", "#db2777",
  "#dc2626", "#d97706", "#16a34a", "#0891b2", "#374151",
];

const QR_PREVIEW_VALUE = "https://qr-platform.vercel.app/preview";

export default function QRStylePicker({ value, onChange, previewValue, logoUrl, showLogo }: Props) {
  function set<K extends keyof QRStyle>(key: K, val: QRStyle[K]) {
    onChange({ ...value, [key]: val });
  }

  const preview = previewValue || QR_PREVIEW_VALUE;

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="flex justify-center">
        <div
          className="rounded-2xl p-4 inline-flex items-center justify-center shadow-ambient-sm border border-slate-100"
          style={{ backgroundColor: value.qrBgColor }}
        >
          <QRCodeStyled
            value={preview}
            size={140}
            dotStyle={value.qrDotStyle}
            cornerStyle={value.qrCornerStyle}
            dotColor={value.qrDotColor}
            bgColor={value.qrBgColor}
            gradient={value.qrGradient}
            gradientColor={value.qrGradientColor}
            logoUrl={logoUrl}
            showLogo={showLogo}
          />
        </div>
      </div>

      {/* Dot style */}
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dot Style</p>
        <div className="grid grid-cols-3 gap-2">
          {DOT_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => set("qrDotStyle", s.key)}
              className={`relative flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                value.qrDotStyle === s.key
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="w-full aspect-square max-w-[52px] overflow-hidden rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center">
                <QRCodeStyled
                  value={QR_PREVIEW_VALUE}
                  size={52}
                  dotStyle={s.key}
                  cornerStyle={value.qrCornerStyle}
                  dotColor={value.qrDotColor}
                  bgColor={value.qrBgColor}
                  gradient={value.qrGradient}
                  gradientColor={value.qrGradientColor}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight text-center">{s.label}</span>
              {value.qrDotStyle === s.key && (
                <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Corner style */}
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Corner Style</p>
        <div className="grid grid-cols-3 gap-2">
          {CORNER_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => set("qrCornerStyle", s.key)}
              className={`relative flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                value.qrCornerStyle === s.key
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="w-full aspect-square max-w-[52px] overflow-hidden rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center">
                <QRCodeStyled
                  value={QR_PREVIEW_VALUE}
                  size={52}
                  dotStyle={value.qrDotStyle}
                  cornerStyle={s.key}
                  dotColor={value.qrDotColor}
                  bgColor={value.qrBgColor}
                  gradient={value.qrGradient}
                  gradientColor={value.qrGradientColor}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight text-center">{s.label}</span>
              {value.qrCornerStyle === s.key && (
                <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        {/* Dot color */}
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dot Color</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("qrDotColor", c)}
                title={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  value.qrDotColor === c ? "border-blue-500 scale-110" : "border-white shadow-sm"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#242736]">
            <input
              type="color"
              value={value.qrDotColor}
              onChange={(e) => set("qrDotColor", e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
            />
            <span className="text-xs text-slate-500 font-mono">{value.qrDotColor}</span>
          </div>
        </div>

        {/* BG color */}
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Background Color</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["#ffffff", "#f1f5f9", "#fef9c3", "#fce7f3", "#ede9fe", "#ecfdf5", "#0f172a", "#1e3a8a"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("qrBgColor", c)}
                title={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  value.qrBgColor === c ? "border-blue-500 scale-110" : "border-slate-200 shadow-sm"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#242736]">
            <input
              type="color"
              value={value.qrBgColor}
              onChange={(e) => set("qrBgColor", e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
            />
            <span className="text-xs text-slate-500 font-mono">{value.qrBgColor}</span>
          </div>
        </div>
      </div>

      {/* Gradient toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#242736] rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Gradient Dots</p>
          <p className="text-xs text-slate-400 mt-0.5">Blend dot color into a second color</p>
        </div>
        <div
          onClick={() => set("qrGradient", !value.qrGradient)}
          className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${value.qrGradient ? "bg-blue-600" : "bg-slate-300"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value.qrGradient ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>

      {value.qrGradient && (
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gradient End Color</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("qrGradientColor", c)}
                title={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  value.qrGradientColor === c ? "border-blue-500 scale-110" : "border-white shadow-sm"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-[#242736]">
            <input
              type="color"
              value={value.qrGradientColor}
              onChange={(e) => set("qrGradientColor", e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
            />
            <span className="text-xs text-slate-500 font-mono">{value.qrGradientColor}</span>
          </div>
        </div>
      )}
    </div>
  );
}
