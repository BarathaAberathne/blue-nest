import type { Metadata } from "next";
import { Amatic_SC, Roboto } from "next/font/google";
import "@/styles/globals.css";

const bodyFont = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const headingFont = Amatic_SC({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blue Nest Montessori School",
    template: "%s | Blue Nest Montessori",
  },
  description:
    "Blue Nest Montessori School — nurturing curious minds in Harrow, Borehamwood, and Pinner through child-led Montessori education.",
  keywords: ["montessori", "nursery", "harrow", "borehamwood", "pinner", "early years", "childcare"],
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Blue Nest Montessori School",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} font-sans`}>{children}</body>
    </html>
  );
}
