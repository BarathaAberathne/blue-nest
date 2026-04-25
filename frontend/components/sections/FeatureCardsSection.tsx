import { Heart, Lightbulb, Sparkles, SunMedium } from "lucide-react";
import PolaroidCard from "@/components/ui/PolaroidCard";
import { Reveal } from "@/components/ui/Motion";

const cards = [
  {
    title: "Inspiring Classrooms",
    description: "Beautiful, thoughtfully designed spaces that encourage curiosity, focus and creativity.",
    image: "/home/children-outdoor-play.jpg",
    alt: "Child exploring an inspiring classroom",
    accent: "#ef8cab",
    icon: Sparkles,
  },
  {
    title: "Prepared Environment",
    description: "Montessori materials that support hands-on learning, independence and meaningful concentration.",
    image: "/home/outdoor-learning-and-play-area.jpg",
    alt: "Prepared Montessori classroom",
    accent: "#82cfc4",
    icon: Lightbulb,
  },
  {
    title: "Safe & Nurturing",
    description: "A home-away-from-home where every child feels valued, supported and gently guided.",
    image: "/home/outdoor-childrens-play-area.jpg",
    alt: "Warm nursery corner",
    accent: "#b89bdd",
    icon: Heart,
  },
  {
    title: "Play & Grow",
    description: "Learning through play, building confidence, friendships and life skills every day.",
    image: "/home/outdoor-play-for-children.jpg",
    alt: "Children playing and growing outdoors",
    accent: "#f0bd55",
    icon: SunMedium,
  },
];

export default function FeatureCardsSection() {
  return (
    <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="container-site">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="section-kicker">What families notice first</span>
            <h2 className="section-title mt-4 text-[#cf7d9c]">A bright, playful environment built for confidence</h2>
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
