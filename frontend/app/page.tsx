import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import FeatureCardsSection from "@/components/sections/FeatureCardsSection";
import GallerySection from "@/components/sections/GallerySection";
import HeroSection from "@/components/sections/HeroSection";
import IntroSection from "@/components/sections/IntroSection";
import LearningPathSection from "@/components/sections/LearningPathSection";
import ValuesSection from "@/components/sections/ValuesSection";
import VirtualTourStrip from "@/components/sections/VirtualTourStrip";
import SectionDivider from "@/components/ui/SectionDivider";

export const metadata: Metadata = {
  title: "Blue Nest Montessori School – Inspiring Big Futures",
};

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />
      <SectionDivider from="transparent" to="#f9f4ee" variant="wave" />
      <IntroSection />
      <SectionDivider from="#f9f4ee" to="#7fd8d2" variant="torn" />
      <VirtualTourStrip />
      <SectionDivider from="#7fd8d2" to="#f9f4ee" variant="torn" />
      <FeatureCardsSection />
      <SectionDivider from="#f9f4ee" to="rgba(246,213,223,0.26)" variant="scallop" />
      <GallerySection />
      <SectionDivider from="rgba(246,213,223,0.26)" to="#f9f4ee" variant="scallop" flip />
      <LearningPathSection />
      <SectionDivider from="#f9f4ee" to="rgba(191,166,232,0.15)" variant="wave" />
      <ValuesSection />
    </PublicLayout>
  );
}
