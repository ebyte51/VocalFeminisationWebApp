import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Trans flag palette
        "flag-blue": "#5BCEFA",
        "flag-pink": "#F5A9B8",
        "flag-white": "#FFFFFF",
        "tint-blue": "#E8F8FE",
        "tint-pink": "#FDEEF2",
        "navy": "#1c2541",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
