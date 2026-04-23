import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import FeatureCardsSection from "@/components/sections/FeatureCardsSection";
import GallerySection from "@/components/sections/GallerySection";
import HeroSection from "@/components/sections/HeroSection";
import IntroSection from "@/components/sections/IntroSection";
import ValuesSection from "@/components/sections/ValuesSection";
import VirtualTourStrip from "@/components/sections/VirtualTourStrip";
import BreakIllustration from "@/components/ui/BreakIllustration";

export const metadata: Metadata = {
  title: "Blue Nest Montessori School – Inspiring Big Futures",
};

export default function HomePage() {
  return (
    <PublicLayout>
      <HeroSection />

      <BreakIllustration src="/site-images/breaks/break-01.png" align="right" width={280} />
      <IntroSection />

      <BreakIllustration src="/site-images/breaks/break-02.png" align="left" width={260} />
      <VirtualTourStrip />

      <BreakIllustration src="/site-images/breaks/break-03.png" align="right" width={260} />
      <FeatureCardsSection />

      <BreakIllustration src="/site-images/breaks/break-04.png" align="center" width={280} />
      <GallerySection />

      <BreakIllustration src="/site-images/breaks/break-05.png" align="left" width={260} />
      <ValuesSection />
    </PublicLayout>
  );
}
