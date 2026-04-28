import { Heart, Leaf, Sparkles, Utensils } from "lucide-react";
import PolaroidCard from "@/components/ui/PolaroidCard";
import { Reveal } from "@/components/ui/Motion";
import Doodle from "@/components/ui/Doodle";

const cards = [
  {
    title: "Montessori",
    description: "Child-led learning with beautiful Montessori materials that build independence, focus and a lifelong love of discovery.",
    image: "/home/collage-2.png",
    alt: "Child working with Montessori materials",
    accent: "#ef8cab",
    icon: Sparkles,
  },
  {
    title: "Forest School",
    description: "Outdoor learning adventures that connect children with nature, build resilience and spark curiosity beyond the classroom.",
    image: "/home/collage-1.png",
    alt: "Children exploring outdoors at Forest School",
    accent: "#82cfc4",
    icon: Leaf,
  },
  {
    title: "Healthy Food",
    description: "Nutritious, freshly prepared halal meal plans and menus designed to fuel growing minds and bodies every day.",
    image: "/home/collage-3.png",
    alt: "Healthy meals and menus at Blue Nest",
    accent: "#b89bdd",
    icon: Utensils,
  },
  {
    title: "Safe Environments",
    description: "A warm, home-away-from-home where every child feels valued, secure and gently supported to thrive.",
    image: "/home/collage-4.png",
    alt: "Safe and nurturing nursery environment",
    accent: "#f0bd55",
    icon: Heart,
  },
];

export default function FeatureCardsSection() {
  return (
    <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Doodle kind="pink-bird" animated="wiggle" className="absolute left-[3%] top-12 h-11 w-11 opacity-60" />
      <Doodle kind="leaf"      animated="float"  className="absolute right-[4%] bottom-8 h-10 w-10 opacity-55" />
      <div className="container-site">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="section-kicker">What families notice first</span>
            <h2 className="section-title mt-4 text-[#cf7d9c]">Everything that makes Blue Nest special</h2>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <Reveal key={card.title} delay={0.08 * index} className="h-full">
              <PolaroidCard {...card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
