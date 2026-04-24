import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "cursive"],
        body:    ["var(--font-body)", "sans-serif"],
        sans:    ["var(--font-body)", "sans-serif"],
        // backward-compat alias — all existing font-heading classes get Chewy
        heading: ["var(--font-display)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
