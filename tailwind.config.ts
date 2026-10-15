import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#252927",
        muted: "#737a76",
        line: "#e4e8e5",
        mist: "#eef1ef",
        sage: "#a9b9ad",
        "sage-foreground": "#34443a",
        rose: "#f4d6d9",
        "rose-foreground": "#8a3b44",
        "estado-recibido": "#dce6f2",
        "estado-recibido-text": "#3b516b",
        "estado-diagnostico": "#e6e0f3",
        "estado-diagnostico-text": "#4c4170",
        "estado-pendiente": "#f6ebc8",
        "estado-pendiente-text": "#7a6120",
        "estado-reparacion": "#f8dccb",
        "estado-reparacion-text": "#8a4b2a",
        "estado-calidad": "#d3ebe3",
        "estado-calidad-text": "#2f6b5a",
        "estado-listo": "#ddebce",
        "estado-listo-text": "#4a6b2e",
        "estado-entregado": "#e4e4e7",
        "estado-entregado-text": "#3f3f46",
        "estado-cancelado": "#f4d6d9",
        "estado-cancelado-text": "#8a3b44",
      },
      boxShadow: {
        soft: "0 18px 60px -38px rgba(37, 41, 39, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
