import type { Metadata } from "next";
import { faqPageJsonLd, generalFaqs } from "@/lib/faq";
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
  title: "Blue Nest Montessori School – Nursery in Harrow, Pinner, Borehamwood & Aldershot",
  description:
    "Blue Nest Montessori School offers outstanding nursery education for children aged 3 months to 5 years in Harrow, Pinner, Borehamwood and Aldershot. Ofsted Good · Award-winning · Government funding available.",
  openGraph: {
    title: "Blue Nest Montessori School – Nursery in Harrow, Pinner, Borehamwood & Aldershot",
    description:
      "Outstanding Montessori nursery education for children aged 3 months to 5 years in Harrow, Pinner, Borehamwood and Aldershot. Ofsted Good · Award-winning.",
    url: "/",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Two children dressed as astronauts at the Blue Nest Montessori space-station role-play area" }],
    type: "website",
  },
};

// The organisation/LocalBusiness entity lives sitewide in app/layout.tsx (a
// single canonical #organization node). The homepage instead carries FAQ
// structured data — one of the most-cited formats by AI engines and Google.
const faqJsonLd = faqPageJsonLd(generalFaqs);

export default function HomePage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
