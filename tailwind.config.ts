import type { Config } from "tailwindcss";

// Nova Volleyball Club brand palette — see docs/brand.md
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nova: {
          purple: "#9682EB",   // primary / light purple
          deep: "#4D1F84",     // deep purple (wordmark, headings)
          violet: "#5A1FB7",   // accent violet
          sky: "#B9E7FE",      // highlight / star
          black: "#000000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
