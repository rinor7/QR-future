import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        sm: "576px",
        md: "768px",
        lg: "992px",
        xl: "1280px",
        wide: "1400px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "#003ec7",
          "primary-light": "#0052ff",
          secondary: "#4459a8",
          bg: "#f7f9fb",
          surface: "#ffffff",
          "surface-low": "#f2f4f6",
          "surface-container": "#eceef0",
          "surface-high": "#e6e8ea",
          text: "#191c1e",
          "text-secondary": "#434656",
          outline: "#737688",
          "outline-variant": "#c3c5d9",
          error: "#ba1a1a",
          "error-container": "#ffdad6",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #003ec7 0%, #0052ff 100%)",
      },
      boxShadow: {
        ambient: "0px 20px 40px rgba(25, 28, 30, 0.06)",
        "ambient-md": "0px 8px 24px rgba(25, 28, 30, 0.08)",
        "ambient-sm": "0px 4px 12px rgba(25, 28, 30, 0.06)",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
