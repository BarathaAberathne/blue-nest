import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PublicLayout from "@/components/layout/PublicLayout";

// The game is interactive-only; load it on the client so the route ships a
// minimal initial payload (helps keep Lighthouse performance high).
const TreasureHuntGame = dynamic(
  () => import("@/components/games/treasure-hunt/TreasureHuntGame"),
);

export const metadata: Metadata = {
  alternates: { canonical: "/games/forest-school-treasure-hunt" },
  title: "Forest School Treasure Hunt — A Woodland Game for Little Explorers",
  description:
    "Explore a calm woodland scene and find six hidden Forest School treasures — acorn, pinecone, feather, ladybird, Blue Nest bird and oak leaf. A premium, Montessori-inspired game for children aged 2–6, playable on desktop, tablet and mobile.",
  openGraph: {
    title: "Forest School Treasure Hunt — Blue Nest Montessori",
    description:
      "A calm, nature-inspired woodland treasure hunt for children aged 2–6. Find six hidden Forest School treasures.",
    url: "/games/forest-school-treasure-hunt",
    type: "website",
  },
};

export default function ForestSchoolTreasureHuntPage() {
  return (
    <PublicLayout>
      <section className="bg-[#FAF8F4] py-6 sm:py-10">
        <TreasureHuntGame />
      </section>
    </PublicLayout>
  );
}
