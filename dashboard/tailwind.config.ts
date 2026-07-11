import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        benny: {
          gold: "#f1c40f",
          orange: "#e67e22",
          dark: "#0c0c0e",
          panel: "#141418",
          card: "#1a1a1f",
          border: "#2a2a32",
          muted: "#8b8b9a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(241, 196, 15, 0.25)",
        card: "0 4px 24px -4px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(241,196,15,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(241,196,15,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
