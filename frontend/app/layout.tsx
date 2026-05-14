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
  keywords: [
    "montessori nursery harrow",
    "nursery in pinner",
    "nursery in borehamwood",
    "forest school harrow",
    "montessori nursery london",
    "early years nursery harrow",
    "childcare harrow",
    "ofsted good nursery",
    "montessori school",
    "nursery near me",
  ],
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

// Site-wide LocalBusiness/ChildCare JSON-LD. Branch pages keep their own
// per-branch JSON-LD with specific address/coords/telephone; this one is the
// parent organisation node so Google can tie everything together.
const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ChildCare"],
  name: "Blue Nest Montessori School",
  url: "https://bluenest.uk",
  logo: "https://bluenest.uk/email/logo.png",
  image: "https://bluenest.uk/home/montessori-learning.jpeg",
  description:
    "Blue Nest Montessori School — nurturing curious minds in Harrow, Borehamwood, and Pinner through child-led Montessori education.",
  telephone: "+44 20 8861 5574",
  email: "manager@bluenest.uk",
  areaServed: ["Harrow", "Pinner", "Borehamwood", "Northwood", "London"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "29 Churchfield Close",
    addressLocality: "Harrow",
    postalCode: "HA2 6BD",
    addressCountry: "GB",
  },
  sameAs: [
    "https://www.facebook.com/bluenestmontessori",
    "https://www.instagram.com/bluenestmontessori",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // JSON.stringify is safe here — the object is fully literal and trusted.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
