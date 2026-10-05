const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        line: "var(--line)",
        muted: "var(--muted)",
        ink: "var(--ink)",
        sage: {
          DEFAULT: "var(--sage)",
          foreground: "var(--sage-foreground)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          foreground: "var(--blue-foreground)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          foreground: "var(--amber-foreground)",
        },
        rose: {
          DEFAULT: "var(--rose)",
          foreground: "var(--rose-foreground)",
        },
        lavender: {
          DEFAULT: "var(--lavender)",
          foreground: "var(--lavender-foreground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 12px 32px -20px rgb(37 41 39 / 22%)",
      },
    },
  },
};

export default tailwindConfig;
