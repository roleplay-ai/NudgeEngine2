import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        // Brand
        brand: {
          yellow:  "#FFCE00",
          purple:  "#623CEA",
          dark:    "#221D23",
          green:   "#23CE68",
          orange:  "#F68A29",
          red:     "#ED4551",
          blue:    "#3699FC",
        },
        // Neutral
        surface: {
          DEFAULT: "#FFFDF5",
          card:    "#FFFFFF",
          muted:   "#FAFAF7",
          input:   "#FFF6CF",
        },
        text: {
          primary:   "#221D23",
          secondary: "#6B6B6B",
          muted:     "#8A8090",
        },
        border: {
          DEFAULT: "rgba(34,29,35,0.08)",
          strong:  "rgba(34,29,35,0.15)",
        },
      },
      borderRadius: {
        card:   "18px",
        input:  "10px",
        pill:   "999px",
        icon:   "12px",
      },
      boxShadow: {
        card:   "0 2px 12px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.08)",
        sidebar: "4px 0 24px rgba(0,0,0,0.18)",
        topbar:  "0 2px 12px rgba(0,0,0,0.04)",
        yellow:  "0 2px 8px rgba(255,206,0,0.30)",
        "yellow-hover": "0 4px 16px rgba(255,206,0,0.40)",
        green:   "0 2px 8px rgba(35,206,104,0.30)",
      },
      animation: {
        "fade-up":    "fadeUp 0.4s ease both",
        "fade-in":    "fadeIn 0.3s ease both",
        "pop-in":     "popIn 0.3s ease both",
        "count-up":   "countUp 0.5s ease both",
        "glow-pulse": "glowPulse 2s infinite",
        "slide-left": "slideLeft 0.3s ease both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        popIn: {
          "0%":   { transform: "scale(0.5)", opacity: "0" },
          "70%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(255,206,0,0.35)" },
          "50%":     { boxShadow: "0 0 0 8px rgba(255,206,0,0)" },
        },
        slideLeft: {
          from: { opacity: "0", transform: "translateX(24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
