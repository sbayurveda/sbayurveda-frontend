/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ayur: {
          green: "#005F33",
          "green-dark": "#00461f",
          "green-light": "#0A7A44",
          gold: "#D4AF37",
          yellow: "#FFC107",
          cream: "#FBF8F1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.06)",
        "card-hover": "0 8px 24px rgba(0,95,51,0.15)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        marquee: "marquee 22s linear infinite",
        pop: "pop 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};
