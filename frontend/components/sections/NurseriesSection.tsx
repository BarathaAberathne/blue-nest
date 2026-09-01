import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import CardImageSlider from "@/components/ui/CardImageSlider";
import { getPublicBranches } from "@/lib/branch-public";

// The comingSoon flags below are the render FALLBACK; the live branch status
// from the backend overrides them at request time (see NurseriesSection body).
const branchesFallback = [
  {
    name:        "Harrow",
    href:        "/branches/harrow",
    images: [
      { src: "/home/branches/harrow/harrow-office.webp",     alt: "Blue Nest Montessori Harrow nursery garden and outdoor play area" },
      { src: "/home/branches/harrow/harrow-gallery-04.webp", alt: "Children learning in a bright classroom at Blue Nest Montessori Harrow" },
      { src: "/home/branches/harrow/harrow-gallery-09.webp", alt: "Child enjoying a music activity at Blue Nest Montessori Harrow" },
      { src: "/home/branches/harrow/harrow-gallery-02.webp", alt: "Children at outdoor water play at Blue Nest Montessori Harrow" },
    ],
    description: "Our flagship nursery in Harrow offers a warm, Montessori-inspired environment with spacious classrooms, a dedicated outdoor play area, and an award-winning team.",
    tag:         "Most Popular",
    color:       "var(--branch-harrow)",
    cta:         "View Nursery",
  },
  {
    name:        "Pinner",
    href:        "/branches/pinner",
    images: [
      { src: "/home/branches/pinner/pinner-office.webp",     alt: "An educator and children at a busy activity table at Blue Nest Pinner" },
      { src: "/home/branches/pinner/pinner-gallery-01.webp", alt: "An educator and children at a tabletop activity at Blue Nest Pinner" },
      { src: "/home/branches/pinner/pinner-gallery-02.webp", alt: "Children exploring a small-world village display in the Blue Nest Pinner garden" },
      { src: "/home/branches/pinner/pinner-gallery-03.webp", alt: "An educator with children at an outdoor activity table at Blue Nest Pinner" },
    ],
    description: "Nestled in Pinner, this branch combines authentic Montessori learning with a calm, home-away-from-home atmosphere that children and parents love.",
    color:       "var(--branch-pinner)",
    cta:         "View Nursery",
  },
  {
    name:        "Borehamwood",
    href:        "/branches/borehamwood",
    images: [
      { src: "/home/branches/borehamwood/borehamwood-office.webp",     alt: "Practitioner and children exploring an ocean small-world sensory tray at Blue Nest Montessori Borehamwood" },
      { src: "/home/branches/borehamwood/borehamwood-gallery-01.webp", alt: "Children at a small-world sand sensory tray at Blue Nest Montessori Borehamwood" },
      { src: "/home/branches/borehamwood/borehamwood-gallery-02.webp", alt: "Child mark-making with a practitioner at Blue Nest Montessori Borehamwood" },
      { src: "/home/branches/borehamwood/borehamwood-gallery-03.webp", alt: "Children in the underwater sensory projection room at Blue Nest Montessori Borehamwood" },
    ],
    description: "Our Borehamwood nursery brings the full Blue Nest experience to families in Hertfordshire — the same high standard of Montessori care and learning.",
    color:       "var(--branch-borehamwood)",
    cta:         "View Nursery",
  },
  {
    name:        "Northwood",
    href:        "/branches/northwood",
    images: [
      { src: "/home/outdoor-play-for-children-new.jpg",  alt: "Blue Nest Montessori coming soon to Northwood, HA6" },
      { src: "/home/forest-school.jpg",                  alt: "Woodland forest school setting near Northwood" },
      { src: "/home/forest-school-2.jpg",                alt: "Children enjoying nature-based outdoor learning near Northwood" },
      { src: "/home/forest-school-3.jpg",                alt: "Leafy woodland play space near Northwood" },
    ],
    description: "We're expanding to Northwood, HA6! Register your interest now to be first in line for a place at our newest nursery.",
    comingSoon:  true,
    color:       "var(--branch-northwood)",
    cta:         "Register Interest",
  },
  {
    name:        "Aldershot",
    href:        "/branches/aldershot",
    images: [
      { src: "/home/branches/aldershot/aldershot-hero.webp",       alt: "The Blue Nest Montessori Aldershot nursery building and artificial-lawn garden" },
      { src: "/home/branches/aldershot/aldershot-gallery-02.webp", alt: "The outdoor playground at Blue Nest Montessori Aldershot with swings under mature trees" },
      { src: "/home/branches/aldershot/aldershot-gallery-09.webp", alt: "The bright preschool room with floor-to-ceiling garden windows at Blue Nest Montessori Aldershot" },
      { src: "/home/branches/aldershot/aldershot-gallery-05.webp", alt: "A cosy reading den with soft toys and board books at Blue Nest Montessori Aldershot" },
    ],
    description: "Our newest nursery on Belle Vue Road, Aldershot, bringing child-led Montessori learning and daily outdoor exploration to Hampshire.",
    color:       "var(--branch-aldershot)",
    cta:         "Book a Visit",
  },
  {
    name:        "Pinner Green",
    href:        "/branches/pinner-green",
    images: [
      { src: "/home/outdoor-learning-and-play-area.jpg", alt: "Blue Nest Montessori coming soon to Pinner Green" },
      { src: "/home/children-outdoor-play.jpg",          alt: "Children enjoying outdoor play, coming soon to Pinner Green" },
      { src: "/home/outdoor-childrens-play-area2.jpg",   alt: "Calm outdoor play area, coming soon to Pinner Green" },
      { src: "/home/outdoor-play-for-children.jpg",      alt: "Outdoor learning space, coming soon to Pinner Green" },
    ],
    description: "We're expanding to Pinner Green! Register your interest now to be first in line for a place at our newest nursery in the community.",
    comingSoon:  true,
    color:       "var(--branch-pinner-green)",
    cta:         "Register Interest",
  },
];

export default async function NurseriesSection() {
  // Live status overrides the static comingSoon flags so opening a branch in
  // the admin flips the card badge and CTA without a code change.
  const live = await getPublicBranches();
  const statusBySlug = new Map((live ?? []).map((b) => [b.slug, b.status]));
  const branches = branchesFallback.map((b) => {
    const slug = b.href.replace("/branches/", "");
    const status = statusBySlug.get(slug);
    if (!status) return b;
    const comingSoon = status === "coming_soon";
    return {
      ...b,
      comingSoon,
      cta: comingSoon ? "Register Interest" : b.cta === "Register Interest" ? "View Nursery" : b.cta,
    };
  });
  const activeCount = branches.filter((b) => !b.comingSoon).length;
  const soonCount = branches.length - activeCount;
  const countWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
  return (
    <section id="our-nurseries" className="blush-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="container-site">

        <Reveal>
          <div className="mb-12 text-center">
            <span className="section-kicker">Our nurseries</span>
            <h2 className="section-title mt-4">Find your nearest Blue Nest</h2>
            <p className="section-subtitle mx-auto mt-5 max-w-xl">
              {countWords[activeCount] ?? activeCount} active nurseries across North London, Hertfordshire and Hampshire{soonCount > 0 ? `, plus ${(countWords[soonCount] ?? String(soonCount)).toLowerCase()} more coming soon` : ""},
              each offering the same outstanding Montessori education and care.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch, i) => (
            <Reveal key={branch.name} delay={0.09 * i} className="flex">
              <Link
                href={branch.href}
                aria-label={`${branch.cta} — ${branch.name}`}
                className={`group card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(90,74,66,0.13)] ${branch.comingSoon ? "opacity-90" : ""}`}
              >

                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <CardImageSlider
                    images={branch.images}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    imageClassName={`object-cover transition-transform duration-500 group-hover:scale-105 ${branch.comingSoon ? "brightness-90" : ""}`}
                    dotColor="#ffffff"
                    label={`${branch.name} photos`}
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
