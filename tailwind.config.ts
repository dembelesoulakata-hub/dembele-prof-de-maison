import type { Config } from "tailwindcss";

const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"),
        foreground: c("foreground"),
        card: c("card"),
        primary: c("primary"),
        "primary-fg": c("primary-fg"),
        accent: c("accent"),
        "accent-fg": c("accent-fg"),
        muted: c("muted"),
        "muted-fg": c("muted-fg"),
        border: c("border"),
        destructive: c("destructive"),
        success: c("success"),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "0.9rem" },
    },
  },
  plugins: [],
} satisfies Config;
