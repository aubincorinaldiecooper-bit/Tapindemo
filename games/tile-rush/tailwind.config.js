/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // shadcn/ui colour tokens used by the sliding puzzle gallery.
      fontFamily: {
        display: ["var(--font-display)"],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        band: { from: "hsl(var(--band-from) / <alpha-value>)", to: "hsl(var(--band-to) / <alpha-value>)", ink: "hsl(var(--band-ink) / <alpha-value>)" },
        panel: { DEFAULT: "hsl(var(--panel) / <alpha-value>)", ink: "hsl(var(--panel-ink) / <alpha-value>)", muted: "hsl(var(--panel-muted) / <alpha-value>)" },
        brand: { DEFAULT: "hsl(var(--brand) / <alpha-value>)", edge: "hsl(var(--brand-edge) / <alpha-value>)", ink: "hsl(var(--brand-ink) / <alpha-value>)" },
        candy: { DEFAULT: "hsl(var(--candy) / <alpha-value>)", edge: "hsl(var(--candy-edge) / <alpha-value>)" },
        mint: "hsl(var(--mint) / <alpha-value>)",
        star: "hsl(var(--star) / <alpha-value>)",
        scrim: "hsl(var(--scrim) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
