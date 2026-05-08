import type { Metadata } from "next";
import { Chewy, Nunito } from "next/font/google";
import "@/styles/globals.css";

const displayFont = Chewy({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
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
  icons: {
    icon: "/home/favicon.png",
    apple: "/home/favicon.png",
  },
  metadataBase: new URL("https://bluenest.uk"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Blue Nest Montessori School",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori — nurturing curious minds" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@bluenestschool",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
