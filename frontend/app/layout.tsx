import type { Metadata } from "next";
import { Chewy, Nunito, Space_Grotesk, Inter } from "next/font/google";
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

// Admin-only type system (professional / industrial). Scoped to the admin shell
// via CSS variables in globals.css — the public site keeps Chewy/Nunito.
const adminHeadingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-admin-heading",
  display: "swap",
});

const adminBodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-admin-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blue Nest Montessori School — Nursery in Harrow, Pinner & Borehamwood",
    template: "%s | Blue Nest Montessori",
  },
  description:
    "Blue Nest Montessori School — Ofsted Good Montessori day nursery and preschool for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood, with new branches coming to Pinner Green and Northwood. Funded childcare, forest school and warm Montessori care.",
  keywords: [
    // Branded + branch-local (matches Yell high-impression terms)
    "montessori nursery harrow",
    "nursery in pinner",
    "nursery in borehamwood",
    "harrow nursery",
    "pinner nursery",
    "borehamwood nursery",
    "forest school harrow",
    // Service modifiers that pulled traffic in the Yell report
    "day nursery",
    "private nursery",
    "infant nursery",
    "childcare nursery",
    "infant daycare",
    "nursery services",
    "holiday club pinner",
    // Informational + intent
    "montessori school near me",
    "nursery near me",
    "montessori school",
    "ofsted good nursery",
    "funded childcare",
    "15 hours funded childcare",
    "30 hours funded childcare",
    "early years nursery harrow",
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
    images: [{
      url: "/home/branches/harrow/harrow-home-hero.jpg",
      width: 1920,
      height: 1440,
      alt: "Blue Nest Montessori — Ofsted Good Montessori nursery in Harrow, Pinner and Borehamwood",
    }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@bluenestschool",
  },
};

// Site-wide LocalBusiness/Preschool/ChildCare JSON-LD. Branch pages keep
// their own per-branch JSON-LD with specific address/coords/telephone;
// this one is the parent organisation node so Google can tie everything
// together. `Preschool` is the most recognised type for early-years
// settings; we also list `ChildCare` and `LocalBusiness` for breadth.
const organisationNode = {
  "@type": ["Preschool", "ChildCare", "LocalBusiness"],
  "@id": "https://bluenest.uk/#organization",
  name: "Blue Nest Montessori School",
  url: "https://bluenest.uk",
  logo: "https://bluenest.uk/home/logo_new.png",
  image: "https://bluenest.uk/home/branches/harrow/harrow-home-hero.jpg",
  description:
    "Award-winning Ofsted Good Montessori day nursery for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood, with new settings coming soon to Pinner Green and Northwood. Funded childcare (15/30 hours) and forest school programmes.",
  telephone: "+44 20 8861 5574",
  email: "manager@bluenest.uk",
  priceRange: "££",
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "07:30",
    closes: "18:00",
  }],
  // areaServed lists every locality our branches reach. Order matters for
  // local-pack signals — keep primary towns first.
  areaServed: [
    "Harrow",
    "Pinner",
    "Borehamwood",
    "Pinner Green",
    "Northwood",
    "Harrow on the Hill",
    "South Harrow",
    "North Harrow",
    "Rayners Lane",
    "Wealdstone",
    "Hatch End",
    "Eastcote",
    "Elstree",
    "Radlett",
    "Bushey",
    "London",
    "Hertfordshire",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "29 Churchfield Close",
    addressLocality: "Harrow",
    postalCode: "HA2 6BD",
    addressCountry: "GB",
  },
  award: "Montessori School of the Year 2019–2025 (London Prestige Awards)",
  sameAs: [
    "https://www.facebook.com/BlueNestMontessorischool",
    "https://www.instagram.com/bluenest_montessori",
    "https://www.yell.com/biz/blue-nest-montessori-school-harrow-341644/",
  ],
};

// Sitewide JSON-LD graph: the organisation entity + a WebSite node, so engines
// have a single clean, linkable site identity (the homepage no longer ships a
// second, conflicting #organization node). aggregateRating is intentionally
// omitted until real, verifiable review data (e.g. Google) exists — we never
// fabricate ratings.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organisationNode,
    {
      "@type": "WebSite",
      "@id": "https://bluenest.uk/#website",
      url: "https://bluenest.uk",
      name: "Blue Nest Montessori School",
      inLanguage: "en-GB",
      publisher: { "@id": "https://bluenest.uk/#organization" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // GA4 only loads when the measurement ID env var is set, so dev/preview
  // environments stay clean. Both scripts are afterInteractive-equivalent
  // (async + bottom of <head>) — they never block the page or the form.
  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // JSON.stringify is safe here — the object is fully literal and trusted.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {ga4Id ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', '${ga4Id}', { send_page_view: true });`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${adminHeadingFont.variable} ${adminBodyFont.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
