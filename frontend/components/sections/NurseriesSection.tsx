import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const branches = [
  {
    name:        "Harrow",
    href:        "/branches/harrow",
    image:       "/home/blue-nest-school-exterior.jpg",
    alt:         "Blue Nest Montessori nursery in Harrow",
    description: "Our flagship nursery in Harrow offers a warm, Montessori-inspired environment with spacious classrooms, a dedicated outdoor play area, and an award-winning team.",
    tag:         "Most Popular",
  },
  {
    name:        "Pinner",
    href:        "/branches/pinner",
    image:       "/home/outdoor-childrens-play-area.jpg",
    alt:         "Blue Nest Montessori nursery in Pinner",
    description: "Nestled in Pinner, this branch combines authentic Montessori learning with a calm, home-away-from-home atmosphere that children and parents love.",
  },
  {
    name:        "Borehamwood",
    href:        "/branches/borehamwood",
    image:       "/home/children-outdoor-play.jpg",
    alt:         "Blue Nest Montessori nursery in Borehamwood",
    description: "Our Borehamwood nursery brings the full Blue Nest experience to families in Hertfordshire — the same high standard of Montessori care and learning.",
  },
  {
    name:        "Northwood",
    href:        "/branches/northwood",
    image:       "/home/outdoor-play-for-children-new.jpg",
    alt:         "Blue Nest Montessori coming soon to Northwood, HA6",
    description: "We're expanding to Northwood, HA6! Register your interest now to be first in line for a place at our newest nursery.",
    comingSoon:  true,
  },
];

export default function NurseriesSection() {
  return (
    <section id="our-nurseries" className="blush-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="container-site">

        <Reveal>
          <div className="mb-12 text-center">
            <span className="section-kicker">Our nurseries</span>
            <h2 className="section-title mt-4">Find your nearest Blue Nest</h2>
            <p className="section-subtitle mx-auto mt-5 max-w-xl">
              Three active nurseries across North London and Hertfordshire, plus a fourth coming soon —
              each offering the same outstanding Montessori education and care.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {branches.map((branch, i) => (
            <Reveal key={branch.name} delay={0.09 * i} className="flex">
              <article className={`card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(90,74,66,0.13)] ${branch.comingSoon ? "opacity-90" : ""}`}>

                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={branch.image}
                    alt={branch.alt}
                    fill
                    className={`object-cover transition-transform duration-500 hover:scale-105 ${branch.comingSoon ? "brightness-90" : ""}`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {branch.comingSoon ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[rgba(247,215,116,0.92)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-[#7a5c00] shadow-[0_4px_12px_rgba(247,215,116,0.45)]">
                      Coming Soon
                    </span>
                  ) : branch.tag ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[#f4aac8] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-white shadow-[0_4px_12px_rgba(244,170,200,0.40)]">
                      {branch.tag}
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col px-6 py-6">
                  <h3 className="card-title text-[var(--ink)]">{branch.name}</h3>
                  <p className="body-text mt-3 flex-1">
                    {branch.comingSoon
                      ? "We're expanding to Northwood, HA6! Register your interest now to be first in line for a place at our newest nursery."
                      : branch.description}
                  </p>
                  <Link
                    href={branch.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#3aada9] transition-all duration-200 hover:gap-3"
                  >
                    {branch.comingSoon ? "Register Interest" : "View Nursery"}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </div>

              </article>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
