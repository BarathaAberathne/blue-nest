import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PublicLayout from "@/components/layout/PublicLayout";

// Interactive client game — loaded on the client so the route ships a minimal
// initial payload, helping keep Lighthouse performance high.
const GardenGame = dynamic(() => import("@/components/games/garden/GardenGame"));

export const metadata: Metadata = {
  alternates: { canonical: "/games/grow-your-garden" },
  title: "Grow Your Own Blue Nest Garden — A Gentle Planting Game",
  description:
    "Choose a plant, sow the seed, water it, give it sunshine and watch it grow! A calm, Montessori-inspired gardening game for children aged 2–6, with friendly facts and a Garden Explorer badge. Playable on desktop, tablet and mobile.",
  openGraph: {
    title: "Grow Your Own Blue Nest Garden — Blue Nest Montessori",
    description:
      "A calm, Montessori-inspired planting game for children aged 2–6. Plant, water, give sunshine and watch your garden grow.",
    url: "/games/grow-your-garden",
    type: "website",
  },
};

export default function GrowYourGardenPage() {
  return (
    <PublicLayout>
      <section className="bg-[#FAF8F4] py-6 sm:py-10">
        <GardenGame />
      </section>
    </PublicLayout>
  );
}
