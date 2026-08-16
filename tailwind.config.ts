import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          soft: "var(--primary-soft)",
        },
        accent: "var(--accent)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        verified: "var(--verified)",
        warning: "var(--warning)",
        destructive: "var(--destructive)",
        ring: "var(--ring)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        // Modular type scale (mobile-first). Line-heights snap to a 4px grid
        // (size x ~1.4-1.5 rounded to 4). Tracking loosens on small/uppercase
        // text and tightens as display sizes grow — the Uber Move convention.
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.03em" }],
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        base: ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.011em" }],
        lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.011em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.014em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.017em" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.022em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.028em" }],
        "5xl": ["2.75rem", { lineHeight: "1.05", letterSpacing: "-0.033em" }],
        "6xl": ["3.5rem", { lineHeight: "1.04", letterSpacing: "-0.04em" }],
        "7xl": ["4.25rem", { lineHeight: "1.03", letterSpacing: "-0.045em" }],
        "8xl": ["6rem", { lineHeight: "1.02", letterSpacing: "-0.05em" }],
      },
      letterSpacing: {
        // Refined brand/label tracking steps (used with uppercase micro-labels)
        label: "0.2em",
        eyebrow: "0.32em",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,212,255,0.22), 0 12px 36px -14px rgba(0,212,255,0.5)",
        card: "0 10px 32px -14px rgba(2,6,18,0.85)",
        "card-hover": "0 18px 52px -16px rgba(0,212,255,0.38)",
        nav: "0 18px 50px rgba(2,6,18,0.72)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0891b2 0%, #00d4ff 50%, #22d3ee 100%)",
        "brand-radial": "radial-gradient(1200px 600px at 50% -10%, rgba(0,212,255,0.22), transparent 60%)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
