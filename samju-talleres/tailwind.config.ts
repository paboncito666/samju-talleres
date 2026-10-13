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
        ink: "#111113",
        gris: {
          50: "#FAF9F7",
          100: "#F4F2EF",
          200: "#E8E5E1",
          300: "#D6D2CC",
          400: "#A9A39B",
          500: "#817A72",
          600: "#625C55",
          700: "#4A4540",
          800: "#302D29",
          900: "#1D1B19",
        },
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
        "estado-recibido": "#DCE6F2",
        "estado-recibido-text": "#3B516B",
        "estado-diagnostico": "#E6E0F3",
        "estado-diagnostico-text": "#4C4170",
        "estado-pendiente": "#F6EBC8",
        "estado-pendiente-text": "#7A6120",
        "estado-reparacion": "#F8DCCB",
        "estado-reparacion-text": "#8A4B2A",
        "estado-calidad": "#D3EBE3",
        "estado-calidad-text": "#2F6B5A",
        "estado-listo": "#DDEBCF",
        "estado-listo-text": "#4A6B2E",
        "estado-entregado": "#E4E4E7",
        "estado-entregado-text": "#3F3F46",
        "estado-cancelado": "#F4D6D9",
        "estado-cancelado-text": "#8A3B44",
      },
      borderRadius: {
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        sm: "0 1px 2px rgb(17 17 19 / 6%)",
        md: "0 8px 24px -12px rgb(17 17 19 / 16%)",
        soft: "0 12px 32px -20px rgb(37 41 39 / 22%)",
      },
    },
  },
};

export default tailwindConfig;
