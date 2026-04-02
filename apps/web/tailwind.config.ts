import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "sans-serif"],
        display: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-inter)", "Inter", "monospace"],
      },
      colors: {
        // Lumina Write design tokens
        canvas: {
          bg: "var(--color-background)",
          surface: "var(--color-surface)",
          "surface-low": "var(--color-surface-container-low)",
          "surface-container": "var(--color-surface-container)",
          "surface-high": "var(--color-surface-container-high)",
          "surface-highest": "var(--color-surface-container-highest)",
          "surface-bright": "var(--color-surface-bright)",
          on: "var(--color-on-surface)",
          "on-variant": "var(--color-on-surface-variant)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          container: "var(--color-primary-container)",
          dim: "var(--color-primary-dim)",
          on: "var(--color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          container: "var(--color-secondary-container)",
          on: "var(--color-on-secondary)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          on: "var(--color-on-tertiary)",
        },
        outline: {
          DEFAULT: "var(--color-outline)",
          variant: "var(--color-outline-variant)",
        },
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, var(--color-primary), var(--color-primary-container))",
        "gradient-canvas": "radial-gradient(ellipse at top left, var(--color-surface-bright) 0%, var(--color-background) 60%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124, 58, 237, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(124, 58, 237, 0.35)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "orb-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to: { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "orb-spin": "orb-spin 20s linear infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
