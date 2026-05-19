import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const branches = [
  {
    name:        "Harrow",
    href:        "/branches/harrow",
    image:       "/home/branches/harrow/harrow-office.webp",
    alt:         "Blue Nest Montessori Harrow nursery garden and outdoor play area",
    description: "Our flagship nursery in Harrow offers a warm, Montessori-inspired environment with spacious classrooms, a dedicated outdoor play area, and an award-winning team.",
    tag:         "Most Popular",
    color:       "var(--branch-harrow)",
    cta:         "View Nursery",
  },
  {
    name:        "Pinner",
    href:        "/branches/pinner",
    image:       "/home/branches/pinner/pinner-office.webp",
    alt:         "Busy Montessori classroom at Blue Nest Pinner",
    description: "Nestled in Pinner, this branch combines authentic Montessori learning with a calm, home-away-from-home atmosphere that children and parents love.",
    color:       "var(--branch-pinner)",
    cta:         "View Nursery",
  },
  {
    name:        "Borehamwood",
    href:        "/branches/borehamwood",
    image:       "/home/branches/borehamwood/borehamwood-office.webp",
    alt:         "Blue Nest Montessori Borehamwood nursery",
    description: "Our Borehamwood nursery brings the full Blue Nest experience to families in Hertfordshire — the same high standard of Montessori care and learning.",
    color:       "var(--branch-borehamwood)",
    cta:         "View Nursery",
  },
  {
    name:        "Northwood",
    href:        "/branches/northwood",
    image:       "/home/outdoor-play-for-children-new.jpg",
    alt:         "Blue Nest Montessori coming soon to Northwood, HA6",
    description: "We're expanding to Northwood, HA6! Register your interest now to be first in line for a place at our newest nursery.",
    comingSoon:  true,
    color:       "var(--branch-northwood)",
    cta:         "Register Interest",
  },
  {
    name:        "Pinner Green",
    href:        "/branches/pinner-green",
    image:       "/home/outdoor-learning-and-play-area.jpg",
    alt:         "Blue Nest Montessori coming soon to Pinner Green",
    description: "We're expanding to Pinner Green! Register your interest now to be first in line for a place at our newest nursery in the community.",
    comingSoon:  true,
    color:       "var(--branch-pinner-green)",
    cta:         "Register Interest",
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
              Three active nurseries across North London and Hertfordshire, plus two more coming soon —
              each offering the same outstanding Montessori education and care.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {branches.map((branch, i) => (
            <Reveal key={branch.name} delay={0.09 * i} className="flex">
              <Link
                href={branch.href}
                aria-label={`${branch.cta} — ${branch.name}`}
                className={`group card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(90,74,66,0.13)] ${branch.comingSoon ? "opacity-90" : ""}`}
              >

                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={branch.image}
                    alt={branch.alt}
                    fill
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${branch.comingSoon ? "brightness-90" : ""}`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                  />
                  {branch.comingSoon ? (
                    <span
                      className="absolute left-3 top-3 rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-[#7a5c00] shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
                      style={{ backgroundColor: `${branch.color}` }}
                    >
                      Coming Soon
                    </span>
                  ) : branch.tag ? (
                    <span
                      className="absolute left-3 top-3 rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-white shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
                      style={{ backgroundColor: branch.color }}
                    >
                      {branch.tag}
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col px-6 py-6">
                  <h3 className="card-title text-[var(--ink)]">{branch.name}</h3>
                  <p className="body-text mt-3 flex-1">{branch.description}</p>
                  <span
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold transition-all duration-200 group-hover:gap-3"
                    style={{ color: branch.color }}
                  >
                    {branch.cta}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </span>
                </div>

              </Link>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
