import type { Metadata } from "next";
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
  title: "Blue Nest Montessori School – Nursery in Harrow, Pinner & Borehamwood",
  description:
    "Blue Nest Montessori School offers outstanding nursery education for children aged 3 months to 5 years in Harrow, Pinner and Borehamwood. Ofsted Good · Award-winning · Government funding available.",
};

export default function HomePage() {
  return (
    <PublicLayout>
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
