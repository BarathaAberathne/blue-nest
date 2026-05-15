import type { Metadata } from "next";
import Script from "next/script";
import PublicLayout from "@/components/layout/PublicLayout";
import HeroSection          from "@/components/sections/HeroSection";
import QuickInfoStrip       from "@/components/sections/QuickInfoStrip";
import FeatureCardsSection  from "@/components/sections/FeatureCardsSection";
import AboutSection         from "@/components/sections/AboutSection";
import NurseriesSection     from "@/components/sections/NurseriesSection";
import GalleryPreviewSection from "@/components/sections/GalleryPreviewSection";
import FeesCTASection       from "@/components/sections/FeesCTASection";
import FinalCTASection      from "@/components/sections/FinalCTASection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Blue Nest Montessori School – Nursery in Harrow, Pinner & Borehamwood",
  description:
    "Blue Nest Montessori School offers outstanding nursery education for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood. Ofsted Good · Award-winning · Government funding available.",
  openGraph: {
    title: "Blue Nest Montessori School – Nursery in Harrow, Pinner & Borehamwood",
    description:
      "Outstanding Montessori nursery education for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood. Ofsted Good · Award-winning.",
    url: "/",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Two children dressed as astronauts at the Blue Nest Montessori space-station role-play area" }],
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "ChildCare"],
      "@id": "https://bluenest.uk/#organization",
      name: "Blue Nest Montessori School",
      url: "https://bluenest.uk",
      logo: "https://bluenest.uk/home/logo_new.png",
      image: "https://bluenest.uk/home/branches/harrow/harrow-home-hero.jpg",
      description:
        "Award-winning Montessori nursery for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood. Ofsted Good provider with government funding available.",
      telephone: "02088615574",
      email: "manager@bluenest.uk",
      priceRange: "££",
      openingHours: "Mo-Fr 07:30-18:00",
      address: {
        "@type": "PostalAddress",
        streetAddress: "29 Churchfield Close",
        addressLocality: "Harrow",
        postalCode: "HA2 6BD",
        addressCountry: "GB",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 51.5795,
        longitude: -0.3668,
      },
      areaServed: [
        { "@type": "City", name: "Harrow" },
        { "@type": "City", name: "Pinner" },
        { "@type": "City", name: "Borehamwood" },
      ],
      award: "Montessori School of the Year 2019–2025 (London Prestige Awards)",
      sameAs: [
        "https://www.yell.com/biz/blue-nest-montessori-school-harrow-341644/",
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <PublicLayout>
      <Script
        id="org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HeroSection />
      <QuickInfoStrip />
      <FeatureCardsSection />
      <AboutSection />
      <NurseriesSection />
      <GalleryPreviewSection />
      <FeesCTASection />
      <FinalCTASection />
    </PublicLayout>
  );
}
