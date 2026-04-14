import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        ember: "#c86b3c",
        sand: "#efe3cf",
        moss: "#7a8b5a",
        canvas: "#f7f2e8",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(20, 33, 61, 0.12)",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

