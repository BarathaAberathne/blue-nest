import PolaroidCard from "@/components/ui/PolaroidCard";
import { Reveal } from "@/components/ui/Motion";
import Doodle from "@/components/ui/Doodle";

const cards = [
  {
    title: "Montessori Learning",
    description:
      "Child-led discovery with beautiful Montessori materials that build independence, focus and a genuine love of learning.",
    image: "/home/montessori-learning.jpeg",
    alt: "Child working with Montessori materials at Blue Nest nursery",
    accent: "#ef8cab",
  },
  {
    title: "Forest School",
    description:
      "Outdoor learning adventures that connect children with nature, build resilience and spark curiosity beyond the classroom.",
    image: "/home/forest-school-3.jpg",
    alt: "Children exploring outdoors at Blue Nest Forest School",
    accent: "#82cfc4",
  },
  {
    title: "Healthy Food",
    description:
      "Freshly prepared, nutritious halal meals and menus carefully designed to fuel growing minds and bodies every day.",
    image: "/home/structured-routine.jpg",
    alt: "Healthy halal meals served at Blue Nest Montessori",
    accent: "#b89bdd",
  },
  {
    title: "Safe Environment",
    description:
      "A warm, home-away-from-home where every child feels valued, secure and gently supported to grow and thrive.",
    image: "/home/DSC_0177.jpg",
    alt: "Safe and nurturing nursery environment at Blue Nest",
    accent: "#f0bd55",
  },
];

export default function FeatureCardsSection() {
  return (
    <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Doodle
        kind="pink-bird"
        animated="wiggle"
        className="absolute left-[3%] top-12 h-11 w-11 opacity-60"
      />

      <Doodle
        kind="leaf"
        animated="float"
        className="absolute right-[4%] bottom-8 h-10 w-10 opacity-55"
      />

      <div className="container-site">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="section-kicker">
              What families notice first
            </span>

            <h2 className="section-title mt-4">
              Everything that makes Blue Nest special
            </h2>
          </div>
        </Reveal>

        <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <Reveal
              key={card.title}
              delay={0.08 * index}
              className="flex"
            >
              <PolaroidCard {...card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}