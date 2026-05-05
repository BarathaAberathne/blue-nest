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
      colors: {
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
        },
        branch: {
          harrow:      "#E99FC1",
          pinner:      "#7ECFC8",
          borehamwood: "#BFD3A1",
          northwood:   "#F3C97A",
          pinnerGreen: "#9FC6A8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
