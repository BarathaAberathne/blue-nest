import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import FeatureCardsSection from "@/components/sections/FeatureCardsSection";
import GallerySection from "@/components/sections/GallerySection";
import HeroSection from "@/components/sections/HeroSection";
import IntroSection from "@/components/sections/IntroSection";
import LearningPathSection from "@/components/sections/LearningPathSection";
import ValuesSection from "@/components/sections/ValuesSection";
import VirtualTourStrip from "@/components/sections/VirtualTourStrip";

export const metadata: Metadata = {
  title: "Blue Nest Montessori School – Inspiring Big Futures",
};

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />
      <IntroSection />
      <VirtualTourStrip />
      <FeatureCardsSection />
      <GallerySection />
      <LearningPathSection />
      <ValuesSection />
    </PublicLayout>
  );
}
