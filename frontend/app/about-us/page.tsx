import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  HandHeart,
  Heart,
  Leaf,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  alternates: { canonical: "/about-us" },
  title: "About Us — Blue Nest Montessori School in Harrow, Pinner & Borehamwood",
  description:
    "Learn about Blue Nest Montessori School — our story, our mission and the values behind our Harrow, Pinner and Borehamwood nurseries. A home away from home blending the Montessori method with the UK EYFS framework for children aged 3 months to 5 years.",
  openGraph: {
    title: "About Us — Blue Nest Montessori School",
    description:
      "Our story, mission and values. A home away from home blending Montessori with the EYFS framework across Harrow, Pinner and Borehamwood.",
    url: "/about-us",
    images: [{ url: "/home/about-us-hero.jpg", width: 3109, height: 3051, alt: "A Blue Nest Montessori educator exploring a sensory craft activity with a child" }],
    type: "website",
  },
};

// AboutPage JSON-LD ties this page back to the Organization so search engines
// understand it describes Blue Nest itself, not a generic informational page.
const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Blue Nest Montessori School",
  url: "https://bluenest.uk/about-us",
  about: {
    "@type": "EducationalOrganization",
    name: "Blue Nest Montessori School",
    url: "https://bluenest.uk",
    description:
      "A family of Montessori day nurseries in Harrow, Pinner and Borehamwood for children aged 3 months to 5 years, blending the Montessori method with the UK EYFS framework.",
    areaServed: ["Harrow", "Pinner", "Borehamwood"],
  },
};

// Core values — each maps to something parents can see in the day.
const VALUES = [
  {
    icon: Heart,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
    title: "A home away from home",
    desc: "Warm, calm rooms and a key person for every child. We settle children gently so they feel safe enough to explore.",
  },
  {
    icon: Sparkles,
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.18)",
    title: "Child-led learning",
    desc: "Following Maria Montessori, we let children choose purposeful work and stay with it — building focus, independence and a love of learning.",
  },
  {
    icon: Leaf,
    color: "#3d8a52",
    bg: "rgba(142,203,155,0.20)",
    title: "Time outdoors",
    desc: "Weekly forest school and daily outdoor play. Real mud, real tools and real discovery, whatever the weather.",
  },
  {
    icon: Users,
    color: "#b89bdd",
    bg: "rgba(185,159,224,0.20)",
    title: "Family partnership",
    desc: "Parents are partners. We share daily updates, observations and milestones so home and nursery move together.",
  },
];

// Trust strip — the credentials that sit behind the warmth.
const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.45)",
    label: "Ofsted Registered",
    sub: "Every Blue Nest nursery is Ofsted registered and inspected.",
  },
  {
    icon: HandHeart,
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.22)",
    label: "EYFS + Montessori",
    sub: "The Montessori method blended with the UK Early Years Foundation Stage.",
  },
  {
    icon: Users,
    color: "#3d8a52",
    bg: "rgba(142,203,155,0.25)",
    label: "Qualified Team",
    sub: "DBS-checked, first-aid trained, Montessori-experienced educators.",
  },
  {
    icon: Sparkles,
    color: "#a07a00",
    bg: "rgba(247,215,116,0.28)",
    label: "3 months – 5 years",
    sub: "Full early-years journey, all the way to school readiness.",
  },
];

export default function AboutUsPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[60vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/about-us-hero.jpg"
            alt="A Blue Nest Montessori educator exploring a sensory craft activity with a child"
            fill
            priority
            fetchPriority="high"
            className="object-cover object-center"
            quality={75}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/68" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_60%,rgba(246,213,223,0.50),transparent_46%),radial-gradient(ellipse_at_82%_18%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird" className="left-[5%]  top-8    h-9 w-9 opacity-65" />
        <Doodle kind="leaf"      className="left-[44%] bottom-6 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal eager>
            <span className="section-kicker">Blue Nest Montessori School</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              A home away from home for every child
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
              Blue Nest is a family of Montessori day nurseries across Harrow, Pinner and
              Borehamwood, caring for children aged 3 months to 5 years. We blend the Montessori
              method with the UK EYFS framework so children grow happy, curious and ready for
              school.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PastelButton href="/contact" variant="rose">
                Book a Visit <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <PastelButton href="/why-montessori" variant="mint">
                Our Approach <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          OUR STORY
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower" className="left-[2%]  bottom-12 h-10 w-10 opacity-45 hidden sm:block" />
        <Doodle kind="leaf"        className="right-[8%] bottom-10 h-10 w-10 opacity-55" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Image — left */}
            <Reveal>
              <div className="mx-auto w-full max-w-[360px]">
                <StickerCard
                  src="/home/children-outdoor-play.jpg"
                  alt="Children exploring together at Blue Nest"
                  rotate={-3}
                  sizes="(max-width: 1024px) 80vw, 36vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

            {/* Text — right */}
            <Reveal delay={0.1}>
              <span className="section-kicker">Our story</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Built by a family, for families</h2>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-[3px] w-5 rounded-full bg-[#f1a8ca]" />
                ))}
              </div>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Blue Nest began with a simple belief: that the early years matter more than
                  almost anything else, and that children flourish when they feel genuinely at
                  home. From a single nursery, we&rsquo;ve grown into a small family of settings
                  across{" "}
                  <Link href="/branches/harrow" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Harrow
                  </Link>
                  ,{" "}
                  <Link href="/branches/pinner" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Pinner
                  </Link>{" "}
                  and{" "}
                  <Link href="/branches/borehamwood" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Borehamwood
                  </Link>
                  &nbsp;— with new branches on the way.
                </p>
                <p>
                  Every Blue Nest nursery shares the same heart: calm, beautifully prepared
                  rooms, a warm key person for each child, and a team that treats every family
                  as part of our own. We&rsquo;ve been recognised as one of London&rsquo;s leading
                  Montessori schools, but what we&rsquo;re proudest of is simpler — children who
                  arrive happy and leave confident.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          MISSION
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" className="right-[12%] bottom-8 h-8 w-8 opacity-50 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Text — left */}
            <Reveal>
              <span className="section-kicker">Our mission</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">
                To help every child learn, develop and grow
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Our mission is to give children the best possible start — not by pushing them
                  ahead, but by following their natural curiosity. We provide a prepared
                  environment where children can lead their own learning, supported by educators
                  who know exactly when to step in and when to step back.
                </p>
                <p>
                  Blending Montessori with the EYFS framework means children meet every UK
                  early-years milestone while gaining the independence, focus and language that
                  Montessori is known for. Pair that with weekly{" "}
                  <Link href="/forest-school" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    forest school
                  </Link>{" "}
                  and a genuine home-from-home feel, and you have the Blue Nest day.
                </p>
              </div>
            </Reveal>

            {/* Image — right */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[360px]">
                <StickerCard
                  src="/home/structured-routine.jpg"
                  alt="A calm, structured Montessori routine at Blue Nest"
                  rotate={4}
                  sizes="(max-width: 1024px) 80vw, 36vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          VALUES — 4 cards
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[2%]  top-10    h-9 w-9 opacity-42 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[4%] bottom-10 h-9 w-9 opacity-42 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">What we stand for</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Our values</h2>
              <p className="body-text mt-5">
                Four things shape everything we do — from how we settle a new baby to how we
                prepare a four-year-old for reception class.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_16px_rgba(90,74,66,0.07)]"
                  style={{ background: v.bg }}
                >
                  <span className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                    <v.icon className="h-5 w-5" style={{ color: v.color }} strokeWidth={1.8} />
                  </span>
                  <h3 className="font-heading text-[1.25rem] leading-snug" style={{ color: v.color }}>
                    {v.title}
                  </h3>
                  <p className="body-text mt-3 flex-1 text-sm">{v.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="body-text mx-auto mt-8 max-w-2xl text-center text-sm">
              These values come to life through our people. Meet the{" "}
              <Link href="/our-team" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                team behind Blue Nest
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          TRUST / CREDENTIALS STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <Doodle kind="leaf" className="left-[2%] bottom-6 h-8 w-8 opacity-40 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-start gap-3 rounded-[1.6rem] p-5 ring-1 ring-[rgba(90,74,66,0.06)]"
                  style={{ background: item.bg }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
                    <item.icon className="h-4 w-4" style={{ color: item.color }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-heading text-[1rem] leading-tight" style={{ color: item.color }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-[1.55] text-[rgba(90,74,66,0.85)]">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[3%]  top-12   h-10 w-10 hidden sm:block opacity-40" />
        <Doodle kind="pink-flower" className="right-[18%] bottom-6 h-9  w-9  hidden lg:block opacity-40" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Come and see us</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                The best way to know Blue Nest is to visit
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                Book a visit at our Harrow, Pinner or Borehamwood nursery. We&rsquo;ll show you the
                rooms, introduce your child&rsquo;s key person and talk you through fees and funded
                childcare.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <PastelButton href="/contact" variant="rose">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission" variant="mint">
                  Start an Application <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission/our-fees" variant="blush">
                  See Our Fees <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
