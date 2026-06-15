import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PublicLayout from "@/components/layout/PublicLayout";

// Interactive client game — loaded on the client so the route ships a minimal
// initial payload, helping keep Lighthouse performance high.
const AnimalMatchingGame = dynamic(() => import("@/components/games/animals/AnimalMatchingGame"));

export const metadata: Metadata = {
  alternates: { canonical: "/games/match-the-animals" },
  title: "Match the Animals to Their Homes — A Woodland Habitats Game",
  description:
    "Help each woodland animal find its home! Match the robin, hedgehog, squirrel, duck, bee and rabbit to their habitats in this calm, Montessori-inspired game for children aged 2–6. Learn animal facts, with Easy and Full modes. Playable on desktop, tablet and mobile.",
  openGraph: {
    title: "Match the Animals to Their Homes — Blue Nest Montessori",
    description:
      "A calm, Montessori-inspired habitats game for children aged 2–6. Match each woodland animal to its home and learn fun facts.",
    url: "/games/match-the-animals",
    type: "website",
  },
};

export default function MatchTheAnimalsPage() {
  return (
    <PublicLayout>
      <section className="bg-[#FAF8F4] py-6 sm:py-10">
        <AnimalMatchingGame />
      </section>
    </PublicLayout>
  );
}
