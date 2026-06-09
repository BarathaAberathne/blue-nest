import type { ReactNode, CSSProperties } from "react";
import { Fraunces, Inter } from "next/font/google";

/**
 * Headstone Green Park has its own visual identity, deliberately distinct from
 * the Blue Nest Montessori site: a minimal, outdoor, green theme. We scope a
 * different font pairing to this route only by overriding the global
 * `--font-display` / `--font-body` CSS variables on a wrapper element, so the
 * rest of the site is untouched.
 *
 *   Display : Fraunces — an organic, botanical serif for headings.
 *   Body    : Inter    — a clean, neutral sans for everything else.
 */
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Park palette — soft cream paper, forest greens, warm ink. Exposed as CSS
// variables so the page and its header/footer share one source of truth.
const themeVars = {
  "--ink": "#2a3326",
  "--line": "rgba(31, 52, 33, 0.12)",
} as CSSProperties;

export default function HeadstoneGreenLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#f6f5ee] font-body`}
      style={themeVars}
    >
      {children}
    </div>
  );
}
