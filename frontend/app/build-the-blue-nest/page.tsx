import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BuildTheBlueNest from "./BuildTheBlueNest";

export const metadata: Metadata = {
  alternates: { canonical: "/build-the-blue-nest" },
  title: "Build the Blue Nest — A Gentle Game for Little Explorers",
  description:
    "Help Blue Bird build a cosy nest! A calm, Montessori-inspired drag-and-drop game for children aged 2–6. Drag twigs, leaves, feathers, soft grass and flowers into the nest. Playable on tablet, phone and computer.",
  openGraph: {
    title: "Build the Blue Nest — Blue Nest Montessori",
    description:
      "A calm, Montessori-inspired drag-and-drop game for children aged 2–6. Help Blue Bird build a cosy nest with natural items.",
    url: "/build-the-blue-nest",
    type: "website",
  },
};

export default function BuildTheBlueNestPage() {
  return (
    <PublicLayout>
      <section className="bg-[var(--paper)] py-6 sm:py-10">
        <div className="container-site">
          <BuildTheBlueNest />
        </div>
      </section>
    </PublicLayout>
  );
}
