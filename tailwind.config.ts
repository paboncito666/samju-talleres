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
      },
      boxShadow: {
        soft: "0 18px 60px -38px rgba(37, 41, 39, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
