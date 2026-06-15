import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        brand: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
          50: "#effbf8",
          100: "#d6f5ee",
          200: "#aee9dd",
          300: "#79d6c6",
          400: "#43bcab",
          500: "#12b3a3",
          600: "#0f9b8e",
          700: "#0f766e",
          800: "#115e58",
          900: "#134e4a",
        },
      },
      fontFamily: {
        body: ["var(--font-body)", "Hiragino Sans", "Noto Sans JP", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        halo: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -8px rgba(16,24,40,0.12)",
        "halo-lg": "0 1px 2px rgba(16,24,40,0.04), 0 24px 60px -20px rgba(16,24,40,0.22)",
        glow: "0 10px 30px -10px rgba(15,155,142,0.45)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
